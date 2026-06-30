import yt_dlp

cookie_data = """# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file! Do not edit.

.youtube.com	TRUE	/	FALSE	1817347122	SID	g.a000_gi0l-yuo1_8cwsgXtqNZE3UhWVi47iIkV7Xpa7ZDNiIP0vWtf0LRiGMHWv13FprWAOLFgACgYKAWESARQSFQHGX2MiTuQODDtRW5Y7voMjGmDfoRoVAUF8yKrMe1ehDRYnSr09sTRbB_j10076
.youtube.com	TRUE	/	TRUE	1817347122	__Secure-1PSID	g.a000_gi0l-yuo1_8cwsgXtqNZE3UhWVi47iIkV7Xpa7ZDNiIP0vWL8AeVDjbNKGOw9BrAl4_PwACgYKATkSARQSFQHGX2MiaqrqLQJGb17lEvUS5fQPJRoVAUF8yKoQDtzaiARORHejTwzEN8Dz0076
.youtube.com	TRUE	/	TRUE	1817347122	__Secure-3PSID	g.a000_gi0l-yuo1_8cwsgXtqNZE3UhWVi47iIkV7Xpa7ZDNiIP0vWKxm7Yrnu_odjW4i3tEGkWwACgYKAeESARQSFQHGX2Mi6-z2r2GD8pFEfHAT2InBvRoVAUF8yKpEjRZ3k8Cy-V6hWUX7t9m80076
.youtube.com	TRUE	/	FALSE	1817347122	HSID	AdwTlgyy-xwT2aPcE
.youtube.com	TRUE	/	TRUE	1817347122	SSID	Axrorjyled0cut8_H
.youtube.com	TRUE	/	FALSE	1817347122	APISID	fud_gaa4w1FALAPe/AXyosu-ljol3zMW10
.youtube.com	TRUE	/	TRUE	1817347122	SAPISID	aYwSAobCULVT1gir/ABB882F52LE0AKORV
.youtube.com	TRUE	/	TRUE	1817347122	__Secure-1PAPISID	aYwSAobCULVT1gir/ABB882F52LE0AKORV
.youtube.com	TRUE	/	TRUE	1817347122	__Secure-3PAPISID	aYwSAobCULVT1gir/ABB882F52LE0AKORV
.youtube.com	TRUE	/	TRUE	1817347130	LOGIN_INFO	AFmmF2swRAIfKBQysUcjkYStqwxcYmoXqCiGlzJDoMCVEay62jcK-QIhAK-JpnRTdQmeec_oxUM5xh9V7tnxIy1jCur_AEgIbd4a:QUQ3MjNmeHRKZG9IbU9ENmIydHFrOVNYbFB1bVRwM254UEpyWnQxbXBCNDlYR0dqSUk1SlJFOWd2NWRIOENBclk1RUlmNnREWTdBbmcybW95X19DUFBBaDRtaFFrZTlOZDNaajhSVUJvMG53Ti15ME91Rmh3SjhpeFcyUnozSU1udjFicDB2djZTTHdFRi1jWm1YMU43SC1mc0lvMzItZkhB
.youtube.com	TRUE	/	TRUE	1817347194	PREF	tz=Asia.Saigon
.youtube.com	TRUE	/	TRUE	1814323136	__Secure-1PSIDTS	sidts-CjIByojQUx9f51K2jrQi2AvubFruxJ9o7DI63ysvBPvcPozG15yeXhEbw1dblp23c_9BvBAA
.youtube.com	TRUE	/	TRUE	1814323136	__Secure-3PSIDTS	sidts-CjIByojQUx9f51K2jrQi2AvubFruxJ9o7DI63ysvBPvcPozG15yeXhEbw1dblp23c_9BvBAA
.youtube.com	TRUE	/	FALSE	1814323198	SIDCC	AKEyXzVzmU60aVnz5zKfRgnJ5_5-yRv5DlzF1G9ubbqaAAIoHwgw0yZA9W3yN4BmHUbGYjDtUA
.youtube.com	TRUE	/	TRUE	1814323198	__Secure-1PSIDCC	AKEyXzUudOR9703XGOsC6lJ1NEsfhbJnIbNlvXjXP4BNXGGQ9bChVL7hqbFeRo9XA8l7yiDeEw
.youtube.com	TRUE	/	TRUE	1814323198	__Secure-3PSIDCC	AKEyXzUYuQsZOILEAWsg70AcOh-kx3CzWB_v8IXD-05ssg7kqQaN-O640Z8Eyw4G27J0AlclhQ
.youtube.com	TRUE	/	TRUE	0	YSC	caHaQ1QxFUk
.youtube.com	TRUE	/	TRUE	1798339192	VISITOR_INFO1_LIVE	bzpK2HIR9rE
.youtube.com	TRUE	/	TRUE	1798339192	VISITOR_PRIVACY_METADATA	CgJWThIEGgAgbQ%3D%3D
.youtube.com	TRUE	/	TRUE	1798339128	__Secure-YNID	19.YT=YshRKpHQSeSrHmP64qz4ZDLDuEn2Z0JPh8EZtfQgA_4_qSYzvjv517CqOuYTXdEffZ71iWNZ-ZpuzaczPmx5EE1zUcbDX62fbwDKoAK3ed8he3rvV7QvwB1DbsuAvHtuEk51vUtR_8apl9opCE4jQ2iRvViPdZNcd20n7-qBgvvL1vDjYPxidV9tDHInrdVAqdISh-dbcV15NoL7hI_oUIRHlWVt2hft9arYYb9dm0dkirTt8A7Ou6wdafclk1NMkSALX3p-f_qvdA7nqhceKiBWGXYNmmT9cK9yvUkLX2TejfaHep_wZyxRyqOi-KGl-7EdiyCgkGSz3mjXORPNgw
.youtube.com	TRUE	/	TRUE	1798339130	__Secure-ROLLOUT_TOKEN	CIDyp8awg7zniQEQzpTVy_etlQMY04PQzPetlQM%3D"""
with open("test_cookie.txt", "w") as f:
    f.write(cookie_data)

ydl_opts = {
    'quiet': False,
    'cookiefile': 'test_cookie.txt'
}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        info = ydl.extract_info('https://www.youtube.com/watch?v=u8Tq-5eAeQI', download=False)
        print("Success! Formats found:", len(info.get('formats', [])))
        for f in info.get('formats', []):
            print(f"Format ID: {f.get('format_id')}, Ext: {f.get('ext')}, Vcodec: {f.get('vcodec')}, Acodec: {f.get('acodec')}")
    except Exception as e:
        print("Error:", e)
