const TIKTOK_API = 'https://open.tiktokapis.com/v2';

export async function runTiktok(
  creds: Record<string, string>,
  action: string,
  input: Record<string, any>
): Promise<any> {
  const { accessToken } = creds;

  if (!accessToken) {
    throw new Error('Thiếu cấu hình TikTok Access Token.');
  }

  switch (action) {
    case 'publish_video': {
      const { videoUrl, title, privacyLevel, disableDuet, disableStitch, disableComment } = input || {};
      if (!videoUrl) {
        throw new Error('Thiếu videoUrl để đăng lên TikTok.');
      }

      const payload = {
        post_info: {
          title: title || '',
          privacy_level: privacyLevel || 'PUBLIC_TO_EVERYONE',
          disable_duet: disableDuet ?? false,
          disable_stitch: disableStitch ?? false,
          disable_comment: disableComment ?? false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      };

      try {
        const res = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || data?.error?.code !== 'ok') {
          throw new Error(parseTiktokError(data?.error));
        }

        return {
          status: 'success',
          publish_id: data?.data?.publish_id,
        };
      } catch (error: any) {
        throw new Error(error.message || 'Lỗi không xác định khi kết nối TikTok API.');
      }
    }

    case 'get_publish_status': {
      const { publishId } = input || {};
      if (!publishId) {
        throw new Error('Thiếu publishId để kiểm tra trạng thái.');
      }

      try {
        const res = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({ publish_id: publishId }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || data?.error?.code !== 'ok') {
          throw new Error(parseTiktokError(data?.error));
        }

        return {
          status: 'success',
          data: {
            publishStatus: data?.data?.status, // PROCESSING, FAILED, PUBLISH_COMPLETE
            failReason: data?.data?.fail_reason || '',
          },
        };
      } catch (error: any) {
        throw new Error(error.message || 'Lỗi khi lấy trạng thái publish TikTok.');
      }
    }

    case 'get_creator_info': {
      try {
        const res = await fetch(`${TIKTOK_API}/user/info/?fields=avatar_url,display_name,username`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || data?.error?.code !== 'ok') {
          throw new Error(parseTiktokError(data?.error));
        }

        const user = data?.data?.user || {};
        return {
          status: 'success',
          data: {
            id: user.username,
            name: user.display_name || user.username,
            avatar: user.avatar_url || '',
            category: 'TikTok Creator',
          },
        };
      } catch (error: any) {
        throw new Error(error.message || 'Lỗi khi lấy thông tin người dùng TikTok.');
      }
    }

    default:
      throw new Error(`Action "${action}" không được hỗ trợ bởi TikTok connector.`);
  }
}

// ═══ HELPER: parseTiktokError ═══
function parseTiktokError(errorObj: any): string {
  if (!errorObj) return 'TikTok API Error';
  const code = errorObj.code || '';
  const message = errorObj.message || '';

  if (code === 'access_token_invalid' || code === 'spam_risk_token_invalid') {
    return 'Lỗi TikTok: Token TikTok đã hết hạn hoặc không hợp lệ. Vui lòng kết nối lại tài khoản.';
  }
  if (code === 'rate_limit_exceeded') {
    return 'Lỗi TikTok: Tài khoản của bạn đã đạt giới hạn đăng bài trong ngày.';
  }
  if (code === 'spam_risk_detected') {
    return 'Lỗi TikTok: Phát hiện rủi ro spam. Nội dung hoặc tần suất của bạn bị chặn.';
  }
  if (code === 'video_pull_failed') {
    return 'Lỗi TikTok: Không thể tải video từ URL. Vui lòng đảm bảo link video tồn tại và là link công khai.';
  }
  if (code === 'duration_check_failed') {
    return 'Lỗi TikTok: Video không đáp ứng yêu cầu độ dài của TikTok (tối thiểu 3 giây).';
  }
  if (code === 'file_format_check_failed') {
    return 'Lỗi TikTok: Định dạng file video không hợp lệ. TikTok chỉ hỗ trợ MP4/WebM.';
  }

  return `Lỗi TikTok API [${code}]: ${message}`;
}
