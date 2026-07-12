$(document).ready(function() {
    const $authView = $("#ai2hero-auth-view");
    const $appView = $("#ai2hero-app-view");
    const $loginForm = $("#hero-login-form");
    const $workspaceForm = $("#hero-workspace-form");
    const $loading = $("#hero-auth-loading");
    const $error = $("#hero-auth-error");

    let tempToken = "";

    function checkAuth() {
        chrome.storage.local.get(['herovideo_token', 'herovideo_workspace', 'herovideo_email', 'herovideo_ws_name'], function(result) {
            if (result.herovideo_token && result.herovideo_workspace) {
                // Render Account Header
                const email = result.herovideo_email || 'User';
                const wsName = result.herovideo_ws_name || 'Workspace';
                
                $('#ai2hero-app-account').html(`
                    <div class="hero-account-bar">
                        <div class="hero-account-info">
                            <div class="hero-account-avatar">${wsName.substring(0, 1).toUpperCase()}</div>
                            <div class="hero-account-details">
                                <span class="hero-ws-name">${wsName}</span>
                                <span class="hero-email">${email}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <button id="hero-btn-switch-ws" title="Đổi Workspace" style="background: transparent; border: none; cursor: pointer; color: #a1a1aa; padding: 6px; display: flex; align-items: center; border-radius: 6px; transition: all 0.2s ease;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.1l4 4-4 4"></path><path d="M3 22v-6c0-1.1.9-2 2-2h11"></path><path d="M7 21.9l-4-4 4-4"></path><path d="M21 2v6c0 1.1-.9 2-2 2H7"></path></svg>
                            </button>
                            <button id="hero-btn-logout" title="Đăng xuất" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #a1a1aa; padding: 6px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            </button>
                        </div>
                    </div>
                `);

                // Event Switch Workspace
                $('#hero-btn-switch-ws').hover(
                    function() { $(this).css({background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c'}); },
                    function() { $(this).css({background: 'transparent', color: '#a1a1aa'}); }
                ).on('click', function() {
                    chrome.storage.local.get(['herovideo_workspaces', 'herovideo_temp_auth'], async function(res) {
                        if (res.herovideo_workspaces && res.herovideo_temp_auth) {
                            $appView.hide();
                            $authView.show();
                            $loginForm.hide();
                            $loading.show();

                            try {
                                const authRes = await fetch("http://localhost:3000/api/sim/extension/auth", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ email: res.herovideo_temp_auth.email, password: res.herovideo_temp_auth.password })
                                });
                                const authData = await authRes.json();
                                
                                if (authRes.ok && authData.tempToken && authData.workspaces) {
                                    tempToken = authData.tempToken;
                                    // Update storage with fresh token
                                    chrome.storage.local.set({
                                        'herovideo_workspaces': authData.workspaces,
                                        'herovideo_temp_auth': { 
                                            email: res.herovideo_temp_auth.email, 
                                            password: res.herovideo_temp_auth.password, 
                                            tempToken 
                                        }
                                    });
                                    renderWorkspaces(authData.workspaces, res.herovideo_temp_auth.password);
                                    $loading.hide();
                                    $workspaceForm.show();
                                } else {
                                    // Token expired and re-auth failed (e.g. password changed)
                                    $loading.hide();
                                    $loginForm.show();
                                }
                            } catch (e) {
                                // Fallback to old behavior if network offline
                                tempToken = res.herovideo_temp_auth.tempToken;
                                renderWorkspaces(res.herovideo_workspaces, res.herovideo_temp_auth.password);
                                $loading.hide();
                                $workspaceForm.show();
                            }
                        }
                    });
                });

                // Gán event logout
                $('#hero-btn-logout').hover(
                    function() { $(this).css({background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)'}); },
                    function() { $(this).css({background: 'rgba(255, 255, 255, 0.05)', color: '#a1a1aa', borderColor: 'rgba(255, 255, 255, 0.1)'}); }
                ).on('click', function() {
                    chrome.storage.local.remove(['herovideo_token', 'herovideo_workspace', 'herovideo_email', 'herovideo_ws_name', 'herovideo_subfolder', 'herovideo_workspaces', 'herovideo_temp_auth'], function() {
                        checkAuth();
                    });
                });

                $authView.hide();
                $appView.show();
            } else {
                $appView.hide();
                $authView.show();
                $loginForm.show();
                $workspaceForm.hide();
            }
        });
    }

    checkAuth();

    $("#hero-btn-login").on("click", async function() {
        const email = $("#hero-email").val().trim();
        const password = $("#hero-password").val();

        if (!email || !password) {
            $error.text("Vui lòng nhập đầy đủ Email và Mật khẩu!");
            return;
        }

        $error.text("");
        $loginForm.hide();
        $loading.show();

        try {
            const res = await fetch("http://localhost:3000/api/sim/extension/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            
            if (res.ok && data.tempToken && data.workspaces) {
                tempToken = data.tempToken;
                renderWorkspaces(data.workspaces, password);
                chrome.storage.local.set({
                    'herovideo_workspaces': data.workspaces,
                    'herovideo_temp_auth': { email, password, tempToken }
                });
                $loading.hide();
                $workspaceForm.show();
            } else {
                $error.text(data.error || "Đăng nhập thất bại. Vui lòng thử lại!");
                $loading.hide();
                $loginForm.show();
            }
        } catch (err) {
            $error.text("Lỗi kết nối đến máy chủ AI2Hero.");
            $loading.hide();
            $loginForm.show();
        }
    });

    function renderWorkspaces(workspaces, password) {
        const $list = $("#hero-workspace-list");
        $list.empty();

        workspaces.forEach(ws => {
            const $item = $(`
                <div class="hero-workspace-item" data-id="${ws.id}">
                    <div class="hero-workspace-avatar">${ws.name.substring(0, 2).toUpperCase()}</div>
                    <div class="hero-workspace-info">
                        <h4>${ws.name}</h4>
                        <span>${ws.role}</span>
                    </div>
                </div>
            `);

            $item.on("click", async function() {
                $workspaceForm.hide();
                $loading.show();

                try {
                    const res = await fetch("http://localhost:3000/api/sim/extension/auth/select-workspace", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            tempToken: tempToken,
                            password: password,
                            teamId: ws.id
                        })
                    });

                    const data = await res.json();

                    if (res.ok && data.accessToken) {
                        const slugify = (str) => {
                            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                        };
                        const workspaceSlug = slugify(ws.name || `team-${ws.id}`);

                        chrome.storage.local.set({
                            'herovideo_token': data.accessToken,
                            'herovideo_workspace': ws.id,
                            'herovideo_email': $("#hero-email").val().trim(),
                            'herovideo_ws_name': ws.name,
                            'herovideo_subfolder': "HeroVideo/" + workspaceSlug
                        }, function() {
                            $loading.hide();
                            $authView.hide();
                            $appView.show();
                        });
                    } else {
                        alert(data.error || "Lỗi chọn workspace");
                        $loading.hide();
                        $workspaceForm.show();
                    }
                } catch (err) {
                    alert("Lỗi kết nối");
                    $loading.hide();
                    $workspaceForm.show();
                }
            });

            $list.append($item);
        });
    }

    $("#hero-btn-logout-temp").on("click", function() {
        tempToken = "";
        $workspaceForm.hide();
        $loginForm.show();
    });
});
