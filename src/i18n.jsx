import React, { createContext, useContext, useState } from "react";

const translations = {
  en: {
    nav: { home: "Home", workshop: "Workshop", certificates: "Certificates", brands: "Brands", products: "Products", why: "Why Choose Us", about: "About Us", contact: "Contact", login: "Login" },
    hero: { title: "Kalyankar Batteries", since: "Since 1998 ", callNow: "Call Now", whatsapp: "WhatsApp", viewProducts: "View Products" },
    workshop: { eyebrow: "Our Space", title: "Inside The Workshop", desc: "A glimpse of the showroom and service floor where every battery is tested, fitted and delivered with care." },
    certificates: { eyebrow: "Recognition", title: "Certificates & Authorizations", desc: "Authorized dealership and quality certifications that back every product we sell." },
    trust: { title: "Years of Trust", desc: "For over two and a half decades, Kalyankar Batteries has powered vehicles and homes across Gargoti and the Kolhapur region with genuine batteries, honest advice and dependable after-sales support. What started as a single counter has grown into a trusted name backed by thousands of satisfied customers." },
    brands: { eyebrow: "Our Partners", title: "Brands We Deal In" },
    products: { eyebrow: "Catalogue", title: "Our Products", items: { car: "Car Battery", bike: "Bike Battery", truck: "Truck Battery", inverter: "Inverter Battery", ups: "UPS Battery", erickshaw: "E-Rickshaw Battery" }, cta: "Enquire Now" },
    why: { eyebrow: "Our Promise", title: "Why Choose Us", items: {
      genuine: { title: "Genuine Products", desc: "100% authentic batteries sourced directly from authorized brands." },
      warranty: { title: "Warranty Support", desc: "Complete assistance for warranty claims and replacements." },
      expert: { title: "Expert Installation", desc: "Skilled technicians for safe, correct fitting every time." },
      fast: { title: "Fast Service", desc: "Quick turnaround so you're back on the road sooner." },
      price: { title: "Best Price", desc: "Competitive pricing without compromising on quality." },
      delivery: { title: "Home Delivery", desc: "Doorstep delivery across Gargoti and nearby areas." },
    }},
    about: { eyebrow: "Our Story", title: "About Kalyankar Batteries",
      desc1: "Founded in 1998, Kalyankar Batteries has been a trusted name in the battery industry for over 25 years. Located on the Gargoti-Kolhapur Main Road, we specialise in car, bike, truck, inverter, UPS and e-rickshaw batteries.",
      desc2: "Our commitment to genuine products, honest pricing and expert service has made us the preferred choice for customers across the region. Every battery we sell is backed by proper warranty support and a team that treats every customer like family.",
      stat1: "Years", stat2: "Happy Customers", stat3: "Brands" },
    contact: { eyebrow: "Get In Touch", title: "Contact Us", address: "Address",addressValue: "Shinde Complex, Near Swami Samarth Mangal Karyalay,\nGargoti-Kolhapur Main Road, Gargoti - 416209", mobile: "Mobile", whatsapp: "WhatsApp", email: "Email", timing: "Timing", timingValue: "9:00 AM to 7:00 PM", saturday: "Saturday Closed",
      formName: "Your Name", formPhone: "Phone Number", formMessage: "Your Message", formSubmit: "Send Message", formSuccess: "Thank you! We'll get back to you soon.", call: "Call Now", map: "Open in Maps" },
    footer: { desc: "Certified quality batteries for cars, bikes, trucks, inverters, UPS and e-rickshaws since 1998.", quickLinks: "Quick Links", contactInfo: "Contact Info", login: "Login", rights: "All Rights Reserved." },
    login: { title: "Admin Login", username: "Username", password: "Password", submit: "Login", denied: "Access Denied", locked: "Too many attempts. Try again in", seconds: "seconds", close: "Close" },
  },
  mr: {
    nav: { home: "मुख्यपृष्ठ", workshop: "वर्कशॉप", certificates: "प्रमाणपत्रे", brands: "ब्रँड्स", products: "उत्पादने", why: "आम्हालाच का निवडावे", about: "आमच्याबद्दल", contact: "संपर्क", login: "लॉगिन" },
    hero: { title: "कल्याणकर बॅटरीज", since: "१९९८ पासून • विश्वासार्ह गुणवत्ता", callNow: "कॉल करा", whatsapp: "व्हॉट्सअ‍ॅप", viewProducts: "उत्पादने पहा" },
    workshop: { eyebrow: "आमची जागा", title: "वर्कशॉपची झलक", desc: "प्रत्येक बॅटरी काळजीपूर्वक तपासली, बसवली आणि दिली जाते अशा शोरूम आणि सर्व्हिस फ्लोरची झलक." },
    certificates: { eyebrow: "मान्यता", title: "प्रमाणपत्रे व अधिकृतता", desc: "आम्ही विकत असलेल्या प्रत्येक उत्पादनामागे असलेली अधिकृत डीलरशिप व गुणवत्ता प्रमाणपत्रे." },
    trust: { title: "वर्षांचा विश्वास", desc: "गेल्या अडीच दशकांहून अधिक काळ, कल्याणकर बॅटरीजने गरगोटी आणि कोल्हापूर परिसरातील वाहने व घरांना खऱ्या बॅटरीज, प्रामाणिक सल्ला आणि विश्वासार्ह सेवा दिली आहे. एका काउंटरपासून सुरू झालेला हा प्रवास आज हजारो समाधानी ग्राहकांच्या विश्वासावर उभा आहे." },
    brands: { eyebrow: "आमचे भागीदार", title: "आम्ही विकत असलेले ब्रँड्स" },
    products: { eyebrow: "यादी", title: "आमची उत्पादने", items: { car: "कार बॅटरी", bike: "बाईक बॅटरी", truck: "ट्रक बॅटरी", inverter: "इन्व्हर्टर बॅटरी", ups: "यूपीएस बॅटरी", erickshaw: "ई-रिक्षा बॅटरी" }, cta: "आता चौकशी करा" },
    why: { eyebrow: "आमचे वचन", title: "आम्हालाच का निवडावे", items: {
      genuine: { title: "अस्सल उत्पादने", desc: "अधिकृत ब्रँड्सकडून थेट मिळणाऱ्या १००% अस्सल बॅटरीज." },
      warranty: { title: "वॉरंटी सहाय्य", desc: "वॉरंटी क्लेम आणि बदलीसाठी संपूर्ण मदत." },
      expert: { title: "तज्ञ इन्स्टॉलेशन", desc: "सुरक्षित व अचूक फिटिंगसाठी कुशल तंत्रज्ञ." },
      fast: { title: "जलद सेवा", desc: "तुम्ही लवकर पुन्हा रस्त्यावर याल यासाठी जलद सेवा." },
      price: { title: "उत्तम किंमत", desc: "गुणवत्तेशी तडजोड न करता स्पर्धात्मक किंमत." },
      delivery: { title: "होम डिलिव्हरी", desc: "गरगोटी व परिसरात घरपोच सेवा." },
    }},
    about: { eyebrow: "आमची कहाणी", title: "कल्याणकर बॅटरीजबद्दल",
      desc1: "१९९८ मध्ये स्थापन झालेली कल्याणकर बॅटरीज गेल्या २५+ वर्षांपासून बॅटरी क्षेत्रातील विश्वासार्ह नाव आहे. गरगोटी-कोल्हापूर मुख्य रस्त्यावर स्थित, आम्ही कार, बाईक, ट्रक, इन्व्हर्टर, यूपीएस व ई-रिक्षा बॅटरीजमध्ये विशेष सेवा देतो.",
      desc2: "अस्सल उत्पादने, प्रामाणिक किंमत आणि तज्ञ सेवेमुळे आम्ही परिसरातील ग्राहकांची पहिली पसंती बनलो आहोत. आम्ही विकत असलेली प्रत्येक बॅटरी योग्य वॉरंटी सहाय्याने आणि कुटुंबासारखी वागणूक देणाऱ्या टीमसह येते.",
      stat1: "वर्षे", stat2: "समाधानी ग्राहक", stat3: "ब्रँड्स" },
    contact: { eyebrow: "संपर्क साधा", title: "आमच्याशी संपर्क करा", address: "पत्ता",addressValue: "शिंदे कॉम्प्लेक्स, स्वामी समर्थ मंगल कार्यालयाजवळ,\nगरगोटी-कोल्हापूर मुख्य रस्ता,\nगरगोटी - ४१६२०९", mobile: "मोबाईल", whatsapp: "व्हॉट्सअ‍ॅप", email: "ईमेल", timing: "वेळ", timingValue: "सकाळी ९:०० ते संध्याकाळी ७:००", saturday: "शनिवारी बंद",
      formName: "तुमचे नाव", formPhone: "फोन नंबर", formMessage: "तुमचा संदेश", formSubmit: "संदेश पाठवा", formSuccess: "धन्यवाद! आम्ही लवकरच तुमच्याशी संपर्क करू.", call: "कॉल करा", map: "नकाशामध्ये उघडा" },
    footer: { desc: "१९९८ पासून कार, बाईक, ट्रक, इन्व्हर्टर, यूपीएस व ई-रिक्षासाठी प्रमाणित गुणवत्तेच्या बॅटरीज.", quickLinks: "जलद दुवे", contactInfo: "संपर्क माहिती", login: "लॉगिन", rights: "सर्व हक्क राखीव." },
    login: { title: "अ‍ॅडमिन लॉगिन", username: "युजरनेम", password: "पासवर्ड", submit: "लॉगिन", denied: "प्रवेश नाकारला", locked: "खूप प्रयत्न झाले. पुन्हा प्रयत्न करा", seconds: "सेकंदात", close: "बंद करा" },
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  const t = translations[lang];
  const toggleLang = (l) => setLang(l);
  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
