import psycopg2
from datetime import datetime

COOKIE_DATA = """# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file! Do not edit.

.bilibili.com	TRUE	/	FALSE	1805252035	buvid3	A8CFAF42-26C5-DF34-06EC-C1050857C4DE35029infoc
.bilibili.com	TRUE	/	FALSE	1805252035	b_nut	1773716035
.bilibili.com	TRUE	/	FALSE	1805252041	_uuid	F7EA110109-C2D4-F10B1-A724-1F887214F28841983infoc
.bilibili.com	TRUE	/	FALSE	1808276042	buvid_fp	a9e97b26b0d63ad90fb1629cc61b6f84
.bilibili.com	TRUE	/	FALSE	1813653999	home_feed_column	5
.bilibili.com	TRUE	/	FALSE	1813653999	browser_resolution	1920-945
.bilibili.com	TRUE	/	FALSE	1817303009	buvid4	F23E59B1-45A1-6A7F-EBB8-BE461381DA7D42678-026031710-nR+2uVFLUvYRvoYkTY1m3w%3D%3D
.bilibili.com	TRUE	/	FALSE	1805252087	CURRENT_QUALITY	0
.bilibili.com	TRUE	/	FALSE	1808276088	rpdid	|(kR~R|~mYk0J'u~~J~uY|)~
.bilibili.com	TRUE	/	FALSE	1814278948	theme-tip-show	SHOWED
.bilibili.com	TRUE	/	FALSE	1808298236	LIVE_BUVID	AUTO7917737382356046
.bilibili.com	TRUE	/	FALSE	1808298237	PVID	1
.bilibili.com	TRUE	/	FALSE	1805287286	theme-avatar-tip-show	SHOWED
.bilibili.com	TRUE	/	FALSE	1782875098	bili_ticket	eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODI4NzUwOTgsImlhdCI6MTc4MjYxNTgzOCwicGx0IjotMX0.iQgtXDAw0tjIQCvwgzkx0n3XCoLmRqnojTOoQRUo-Rs
.bilibili.com	TRUE	/	FALSE	1782875098	bili_ticket_expires	1782875038
.bilibili.com	TRUE	/	TRUE	1798170543	SESSDATA	a98f90e3%2C1798170511%2C5ba30%2A61CjCOFUjRv8Z9k2f08tHFEIffZL2rbdNYO9NSRqMX6fD8F5v3qE1Ob4V-yGJeNrcgHMYSVnVGaEZPYWItczVlelc4VDF6bGVHZE5kR25ETHJoUzRlSDJPSmhmT0pGelVUM0RrNXFjUE5kVURtWmNMTFdGNHJUZVVvaFNNLUgyYk5hWGNUMldWSEdRIIEC
.bilibili.com	TRUE	/	TRUE	1798170543	bili_jct	66380b0a5b861a3bf536cf7823b81086
.bilibili.com	TRUE	/	TRUE	1798170543	DedeUserID	3706951196215823
.bilibili.com	TRUE	/	TRUE	1798170543	DedeUserID__ckMd5	9b79312e61eee22c
.bilibili.com	TRUE	/	FALSE	1785210568	bp_t_offset_3706951196215823	1218826540813385728
.bilibili.com	TRUE	/	FALSE	1814278947	CURRENT_FNVAL	4048
www.bilibili.com	FALSE	/	FALSE	0	bmg_af_switch	1
www.bilibili.com	FALSE	/	FALSE	0	bmg_src_def_domain	i1.hdslb.com
www.bilibili.com	FALSE	/	FALSE	0	bmg_af_sc	{"none":{"on":1,"def":"i1.hdslb.com"},"sgp":{"on":1,"def":"i1-sgp.hdslb.com"}}
.bilibili.com	TRUE	/	FALSE	0	sid	8eeli6qi
.bilibili.com	TRUE	/	FALSE	0	b_lsid	4002E9A9_19F13C55F58"""

conn = psycopg2.connect(
    host="localhost",
    port=54322,
    database="postgres",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

# Xóa cookie cũ nếu có
cur.execute("DELETE FROM downloader_cookies WHERE team_id = 7")

# Insert cookie mới
cur.execute("""
    INSERT INTO downloader_cookies (team_id, name, cookie_data, status, created_at, updated_at)
    VALUES (%s, %s, %s, %s, %s, %s)
""", (7, 'Bilibili Cookie', COOKIE_DATA, 'active', datetime.now(), datetime.now()))

conn.commit()

# Xác nhận
cur.execute("SELECT id, name, status, LEFT(cookie_data, 80) FROM downloader_cookies WHERE team_id = 7")
row = cur.fetchone()
print(f"[OK] Da luu cookie ID={row[0]}, name='{row[1]}', status='{row[2]}'")
print(f"    Preview: {row[3]}...")

cur.close()
conn.close()
