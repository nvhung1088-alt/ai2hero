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
                        <button id="hero-btn-logout" title="Đăng xuất">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </button>
                    </div>
                `);

                // Gán event logout
                $('#hero-btn-logout').on('click', function() {
                    chrome.storage.local.remove(['herovideo_token', 'herovideo_workspace', 'herovideo_email', 'herovideo_ws_name', 'herovideo_subfolder'], function() {
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
            const res = await fetch("https://www.ai2hero.com/api/sim/extension/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            
            if (res.ok && data.tempToken && data.workspaces) {
                tempToken = data.tempToken;
                renderWorkspaces(data.workspaces, password);
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
                    const res = await fetch("https://www.ai2hero.com/api/sim/extension/auth/select-workspace", {
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
