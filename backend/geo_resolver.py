import re
from typing import Optional, Tuple

# Comprehensive registry of Indian states and districts coordinates
GEO_REGISTRY = {
    # ── Himachal Pradesh ──
    "himachal pradesh": (31.1048, 77.1734),
    "himachal": (31.1048, 77.1734),
    "hp": (31.1048, 77.1734),
    "shimla": (31.1048, 77.1734),
    "kullu": (31.9579, 77.1095),
    "manali": (32.2432, 77.1892),
    "mandi": (31.7087, 76.9320),
    "kangra": (32.0998, 76.2691),
    "dharamshala": (32.2190, 76.3234),
    "solan": (30.9045, 77.0967),
    "chamba": (32.5534, 76.1258),
    "hamirpur": (31.6862, 76.5213),
    "bilaspur": (31.3312, 76.7554),
    "una": (31.4685, 76.2708),
    "sirmaur": (30.5599, 77.2960),
    "sirmour": (30.5599, 77.2960),
    "nahan": (30.5599, 77.2960),
    "kinnaur": (31.6510, 78.4752),
    "reckong peo": (31.5404, 78.2755),
    "lahaul and spiti": (32.3364, 77.2514),
    "lahaul & spiti": (32.3364, 77.2514),
    "lahaul": (32.5500, 77.0000),
    "spiti": (32.2461, 78.0349),
    "kaza": (32.2276, 78.0710),
    "keylong": (32.5710, 77.0320),
    "palampur": (32.1109, 76.5363),
    "dalhousie": (32.5387, 75.9710),
    "rohtang": (32.3716, 77.2466),

    # ── Uttarakhand ──
    "uttarakhand": (30.0668, 79.0193),
    "dehradun": (30.3165, 78.0322),
    "haridwar": (29.9457, 78.1642),
    "rishikesh": (30.0869, 78.2676),
    "nainital": (29.3919, 79.4542),
    "chamoli": (30.2937, 79.5603),
    "rudraprayag": (30.2858, 78.9811),
    "uttarkashi": (30.7268, 78.4354),
    "pithoragarh": (29.5829, 80.2182),
    "almora": (29.5971, 79.6591),
    "tehri": (30.3926, 78.4800),
    "bageshwar": (29.8377, 79.7717),
    "champawat": (29.3347, 80.0911),
    "joshimath": (30.5564, 79.5663),
    "kedarnath": (30.7352, 79.0669),
    "badrinath": (30.7433, 79.4938),

    # ── Jammu & Kashmir / Ladakh ──
    "jammu and kashmir": (33.7782, 76.5762),
    "jammu": (32.7266, 74.8570),
    "srinagar": (34.0837, 74.7973),
    "anantnag": (33.7311, 75.1522),
    "baramulla": (34.2090, 74.3436),
    "kupwara": (34.5262, 74.2546),
    "pulwama": (33.8718, 74.8955),
    "leh": (34.1526, 77.5771),
    "ladakh": (34.1526, 77.5771),
    "kargil": (34.5539, 76.1349),

    # ── Punjab, Haryana & Delhi ──
    "punjab": (31.1471, 75.3412),
    "amritsar": (31.6340, 74.8723),
    "ludhiana": (30.9010, 75.8573),
    "jalandhar": (31.3260, 75.5762),
    "patiala": (30.3398, 76.3869),
    "chandigarh": (30.7333, 76.7794),
    "haryana": (29.0588, 76.0856),
    "gurugram": (28.4595, 77.0266),
    "gurgaon": (28.4595, 77.0266),
    "faridabad": (28.4089, 77.3178),
    "panipat": (29.3909, 76.9635),
    "ambala": (30.3782, 76.7767),
    "rohtak": (28.8955, 76.6066),
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "noida": (28.5355, 77.3910),
    "ghaziabad": (28.6692, 77.4538),

    # ── Uttar Pradesh & Bihar ──
    "uttar pradesh": (26.8467, 80.9462),
    "lucknow": (26.8467, 80.9462),
    "kanpur": (26.4499, 80.3319),
    "varanasi": (25.3176, 82.9739),
    "agra": (27.1767, 78.0081),
    "prayagraj": (25.4358, 81.8463),
    "allahabad": (25.4358, 81.8463),
    "gorakhpur": (26.7606, 83.3732),
    "meerut": (28.9845, 77.7064),
    "bareilly": (28.3670, 79.4304),
    "aligarh": (27.8974, 78.0880),
    "bihar": (25.0961, 85.3131),
    "patna": (25.5941, 85.1376),
    "gaya": (24.7914, 85.0002),
    "muzaffarpur": (26.1209, 85.3647),
    "bhagalpur": (25.2425, 86.9842),
    "darbhanga": (26.1542, 85.8918),

    # ── West Bengal & North-East ──
    "west bengal": (22.9868, 87.8550),
    "kolkata": (22.5726, 88.3639),
    "darjeeling": (27.0410, 88.2663),
    "siliguri": (26.7271, 88.3953),
    "howrah": (22.5958, 88.2636),
    "assam": (26.2006, 92.9376),
    "guwahati": (26.1445, 91.7362),
    "silchar": (24.8333, 92.7789),
    "dibrugarh": (27.4728, 94.9120),
    "jorhat": (26.7509, 94.2037),
    "tezpur": (26.6528, 92.7926),
    "sikkim": (27.5330, 88.5122),
    "gangtok": (27.3389, 88.6065),
    "meghalaya": (25.4670, 91.3662),
    "shillong": (25.5788, 91.8933),
    "arunachal pradesh": (28.2180, 94.7278),
    "itanagar": (27.0844, 93.6053),
    "nagaland": (26.1584, 94.5624),
    "kohima": (25.6751, 94.1086),
    "manipur": (24.6637, 93.9063),
    "imphal": (24.8170, 93.9368),
    "mizoram": (23.1645, 92.9376),
    "aizawl": (23.7271, 92.7176),
    "tripura": (23.9408, 91.9882),
    "agartala": (23.8315, 91.2868),

    # ── Western & Central India ──
    "rajasthan": (27.0238, 74.2179),
    "jaipur": (26.9124, 75.7873),
    "jodhpur": (26.2389, 73.0243),
    "udaipur": (24.5854, 73.7125),
    "jaisalmer": (26.9157, 70.9083),
    "bikaner": (28.0229, 73.3119),
    "kota": (25.2138, 75.8648),
    "ajmer": (26.4499, 74.6399),
    "gujarat": (22.2587, 71.1924),
    "ahmedabad": (23.0225, 72.5714),
    "surat": (21.1702, 72.8311),
    "vadodara": (22.3072, 73.1812),
    "rajkot": (22.3039, 70.8022),
    "kutch": (23.7337, 69.8597),
    "bhuj": (23.2420, 69.6669),
    "gandhinagar": (23.2156, 72.6369),
    "madhya pradesh": (22.9734, 78.6569),
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577),
    "jabalpur": (23.1815, 79.9864),
    "gwalior": (26.2183, 78.1828),
    "ujjain": (23.1765, 75.7885),
    "chhattisgarh": (21.2787, 81.8661),
    "raipur": (21.2514, 81.6296),
    "bilaspur cg": (22.0797, 82.1409),
    "odisha": (20.9517, 85.0985),
    "bhubaneswar": (20.2961, 85.8245),
    "puri": (19.8135, 85.8312),
    "cuttack": (20.4625, 85.8828),
    "rourkela": (22.2604, 84.8536),

    # ── Maharashtra & Goa ──
    "maharashtra": (19.7515, 75.7139),
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "nagpur": (21.1458, 79.0882),
    "nashik": (19.9975, 73.7898),
    "aurangabad": (19.8762, 75.3433),
    "chhatrapati sambhajinagar": (19.8762, 75.3433),
    "thane": (19.2183, 72.9781),
    "navi mumbai": (19.0330, 73.0297),
    "solapur": (17.6599, 75.9064),
    "kolhapur": (16.7050, 74.2433),
    "goa": (15.2993, 74.1240),
    "panaji": (15.4909, 73.8278),

    # ── Karnataka ──
    "karnataka": (15.3173, 75.7139),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mysuru": (12.2958, 76.6394),
    "mysore": (12.2958, 76.6394),
    "mangaluru": (12.9141, 74.8560),
    "mangalore": (12.9141, 74.8560),
    "hubli": (15.3647, 75.1240),
    "dharwad": (15.4589, 75.0078),
    "belagavi": (15.8497, 74.4977),
    "belgaum": (15.8497, 74.4977),
    "udupi": (13.3409, 74.7421),

    # ── Kerala ──
    "kerala": (10.8505, 76.2711),
    "thiruvananthapuram": (8.5241, 76.9366),
    "trivandrum": (8.5241, 76.9366),
    "kochi": (9.9312, 76.2673),
    "ernakulam": (9.9816, 76.2999),
    "kozhikode": (11.2588, 75.7804),
    "calicut": (11.2588, 75.7804),
    "wayanad": (11.6854, 76.1320),
    "kalpetta": (11.6050, 76.0830),
    "thrissur": (10.5276, 76.2144),
    "alappuzha": (9.4981, 76.3388),
    "alleppey": (9.4981, 76.3388),
    "idukki": (9.8494, 76.9744),
    "kottayam": (9.5916, 76.5222),
    "palakkad": (10.7867, 76.6548),
    "kannur": (11.8745, 75.3704),
    "kollam": (8.8932, 76.6141),
    "pathanamthitta": (9.2648, 76.7870),
    "kasaragod": (12.4996, 74.9869),
    "malappuram": (11.0510, 76.0711),

    # ── Andhra Pradesh & Telangana ──
    "andhra pradesh": (15.9129, 79.7400),
    "visakhapatnam": (17.6868, 83.2185),
    "vizag": (17.6868, 83.2185),
    "vijayawada": (16.5062, 80.6480),
    "guntur": (16.3067, 80.4365),
    "tirupati": (13.6288, 79.4192),
    "kurnool": (15.8281, 78.0373),
    "nellore": (14.4426, 79.9865),
    "telangana": (18.1124, 79.0193),
    "hyderabad": (17.3850, 78.4867),
    "warangal": (17.9689, 79.5941),
    "nizamabad": (18.6725, 78.0941),
    "karimnagar": (18.4386, 79.1288),

    # ── Tamil Nadu ──
    "tamil nadu": (11.1271, 78.6569),
    "chennai": (13.0827, 80.2707),
    "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198),
    "salem": (11.6643, 78.1460),
    "trichy": (10.7905, 78.7047),
    "tiruchirappalli": (10.7905, 78.7047),
    "tirunelveli": (8.7139, 77.7567),
    "vellore": (12.9165, 79.1325),
    "thanjavur": (10.7870, 79.1378),
    "cuddalore": (11.7480, 79.7714),
    "kanyakumari": (8.0883, 77.5385),
    "nagapattinam": (10.7672, 79.8449),
    "erode": (11.3410, 77.7172),
    "kancheepuram": (12.8342, 79.7036),
    "karur": (10.9601, 78.0766),
    "nilgiris": (11.4916, 76.7337),
    "ooty": (11.4102, 76.6950),
    "dindigul": (10.3673, 77.9803),
    "thoothukudi": (8.7642, 78.1348),
    "tuticorin": (8.7642, 78.1348),
    "ramanathapuram": (9.3639, 78.8395),
    "dharmapuri": (12.1211, 78.1582),
    "krishnagiri": (12.5186, 78.2137),
    "namakkal": (11.2189, 78.1674),
    "pudukkottai": (10.3833, 78.8001),
    "sivaganga": (9.8433, 78.4809),
    "theni": (10.0104, 77.4768),
    "tiruppur": (11.1085, 77.3411),
    "tiruvallur": (13.1432, 79.9079),
    "tiruvannamalai": (12.2253, 79.0747),
    "tiruvarur": (10.7661, 79.6344),
    "villupuram": (11.9401, 79.4861),
    "kasol": (32.0100, 77.3150),
    "parwanoo": (30.8358, 76.9602),
    "paonta sahib": (30.4398, 77.6200),
    "baddi": (30.9578, 76.7914),
    "nalagarh": (31.0425, 76.7170),
    "sundernagar": (31.5333, 76.8833),
    "baijnath": (32.0520, 76.6493),
    "nurpur": (32.3000, 75.8900),

    # ── Jharkhand ──
    "jharkhand": (23.6102, 85.2799),
    "ranchi": (23.3441, 85.3096),
    "jamshedpur": (22.8046, 86.2029),
    "dhanbad": (23.7957, 86.4304),
    "bokaro": (23.6693, 86.1511),
    "deoghar": (24.4826, 86.7001),
    "hazaribagh": (23.9966, 85.3687),

    # ── Union Territories & Islands ──
    "andaman and nicobar": (11.7401, 92.6586),
    "andaman": (11.7401, 92.6586),
    "nicobar": (9.1557, 92.7667),
    "port blair": (11.6234, 92.7265),
    "puducherry": (11.9416, 79.8083),
    "pondicherry": (11.9416, 79.8083),
    "lakshadweep": (10.5667, 72.6417),
    "kavaratti": (10.5667, 72.6417),
    "daman": (20.3974, 72.8328),
    "diu": (20.7144, 70.9874),
    "silvassa": (20.2763, 73.0083),
    "dadra and nagar haveli": (20.2763, 73.0083),
}



def clean_text(val: Optional[str]) -> str:
    if not val:
        return ""
    # Remove punctuation and normalize spaces
    return re.sub(r"[^a-zA-Z0-9\s]", " ", str(val).lower()).strip()


def resolve_coordinates(
    district: Optional[str] = None,
    location: Optional[str] = None,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> Optional[Tuple[float, float]]:
    """
    Intelligently resolves latitude and longitude for a given district,
    location, disaster name, or description from our comprehensive Indian registry.
    """
    candidates = [district, location, name, description]
    cleaned_candidates = [clean_text(c) for c in candidates if c]
    full_string = " ".join(cleaned_candidates)

    if not full_string:
        return None

    # 1. Exact match on any candidate
    for c in cleaned_candidates:
        if c in GEO_REGISTRY:
            return GEO_REGISTRY[c]

    # 2. Check for Himachal Pradesh specific keywords & places first
    is_hp = bool(
        re.search(r"\b(himachal|himachal pradesh|hp|h\s*p)\b", full_string)
    )

    hp_places = [
        "shimla", "kullu", "manali", "mandi", "dharamshala", "kangra",
        "solan", "chamba", "hamirpur", "bilaspur", "una", "sirmaur",
        "sirmour", "nahan", "kinnaur", "spiti", "lahaul", "kaza",
        "keylong", "rohtang", "palampur", "dalhousie", "kasol",
        "parwanoo", "paonta sahib", "baddi", "nalagarh", "sundernagar",
        "baijnath", "nurpur"
    ]

    for hp_place in hp_places:
        if re.search(r"\b" + re.escape(hp_place) + r"\b", full_string):
            if hp_place in GEO_REGISTRY:
                return GEO_REGISTRY[hp_place]

    if is_hp:
        return GEO_REGISTRY["himachal pradesh"]

    # 3. Word-boundary substring match for individual candidates (starting from district/location)
    for c in cleaned_candidates:
        for key, coords in GEO_REGISTRY.items():
            if len(key) <= 2:
                continue
            if re.search(r"\b" + re.escape(key) + r"\b", c):
                return coords

    # 4. Global regex search across entire concatenated text
    for key, coords in GEO_REGISTRY.items():
        if len(key) <= 2:
            continue
        if re.search(r"\b" + re.escape(key) + r"\b", full_string):
            return coords

    # 5. Fallback substring match without strict boundaries
    for key, coords in GEO_REGISTRY.items():
        if len(key) >= 4 and key in full_string:
            return coords

    return None

