LEARN FROM PALLAVI GUPTA — Website

ADMIN LOGIN: username admin — password आपको chat में दिया गया है (इसे यहाँ कभी न लिखें, यह repository public है)।
  > Admin Login का लिंक वेबसाइट के सबसे नीचे (footer) में है।
  > Password बदलना हो: Admin Portal > "Admin Password बदलें" > जो 2 लाइनें मिलें उन्हें config.js में
    adminUser / adminHash की जगह डालें > दोबारा deploy करें।

1) config.js में अपना WhatsApp नंबर, फ़ोन, ईमेल, शहर भरें। "secret" किसी को न बताएँ।
2) Deploy: Netlify (app.netlify.com/drop पर unzip किया फ़ोल्डर खींचें) / Vercel / GitHub Pages (सभी फ़ाइलें root में)।
3) Student जोड़ें > Password अपने-आप बनेगा > "भेजें" से WhatsApp पर भेजें। किसी भी फ़ोन पर चलेगा।
4) "Renewal / Fee Reminders" में 15 दिन में समाप्त होने वाले Students दिखेंगे।
5) हर जगह Block: config.js में blocked: ["loginid"] लिखकर दोबारा deploy करें।
6) कोई फ़ाइल बदलें तो sw.js में VERSION बढ़ाएँ (lpg-v5 -> lpg-v6)।
