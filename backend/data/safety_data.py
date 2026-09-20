"""
Verified Disaster Safety & Preparedness Knowledge Base.
Structured, expert-aligned life safety instructions, precautions, emergency kit items,
and interactive readiness checklists for all core disaster categories.
Zero LLM hallucination - deterministic, high-reliability safety repository.
"""

SAFETY_KNOWLEDGE_BASE = {
    "flood": {
        "disasterType": "Flood",
        "category": "Hydrometeorological",
        "severityRisk": "HIGH",
        "description": "Floods occur when water overflows onto normally dry land due to intense rainfall, storm surges, river overflow, or dam failures. Rapid flash floods can occur within minutes.",
        "icon": "Waves",
        "badgeColor": "#38bdf8",
        "overview": {
            "primaryHazards": ["Flash flooding", "Structural collapse", "Waterborne diseases", "Electrocution", "Contaminated drinking water"],
            "vulnerableAreas": ["Riverbanks", "Low-lying coastal zones", "Basements", "Underpasses", "Drainage corridors"]
        },
        "before": {
            "title": "Preparedness & Early Warning Phase",
            "summary": "Take proactive measures before heavy rains or during severe flood watches to protect life and property.",
            "steps": [
                {
                    "title": "Identify Higher Ground & Evacuation Routes",
                    "description": "Map at least two distinct routes to reach officially designated high-ground relief centers or municipal shelters."
                },
                {
                    "title": "Waterproof & Elevate Critical Documents",
                    "description": "Store passports, identification, property deeds, and insurance policies in airtight, waterproof zip pouches on higher floors."
                },
                {
                    "title": "Install Non-Return Valves & Sandbags",
                    "description": "Install check-valves in plumbing to prevent sewer backflow and stack sandbags around external doorways and ground vents."
                },
                {
                    "title": "Establish Family Communication Protocol",
                    "description": "Designate an out-of-district emergency contact person whom all family members will message if localized cellular towers fail."
                }
            ],
            "emergencyKit": [
                "3-day sealed potable water supply (4 liters per person per day)",
                "Non-perishable ready-to-eat rations and high-energy nutrition bars",
                "Waterproof high-lumen flashlight with extra alkaline batteries",
                "Portable power bank (10,000mAh+) kept at 100% charge",
                "Water purification tablets (Chlorine/Iodine based)",
                "Emergency whistle to signal rescue boats without shouting",
                "Heavy-duty waterproof boots and bright raincoats"
            ],
            "checklist": [
                {"id": "fl_1", "text": "Locate nearest high-ground relief shelter or rooftop access route"},
                {"id": "fl_2", "text": "Secure identity records, medical cards, and cash in sealed waterproof pouches"},
                {"id": "fl_3", "text": "Store minimum 72-hour drinking water and non-perishable food supplies"},
                {"id": "fl_4", "text": "Elevate appliances, electric meters, and toxic chemicals above expected flood level"},
                {"id": "fl_5", "text": "Stock water purification tablets and essential prescription medicines (14-day supply)"},
                {"id": "fl_6", "text": "Charge all phones, emergency flashlights, and portable battery banks"},
                {"id": "fl_7", "text": "Clear household drains, gutters, and downspouts of debris"}
            ]
        },
        "during": {
            "title": "Emergency Response & Active Flood Action",
            "summary": "Immediate life-preservation actions when water levels start rising.",
            "steps": [
                {
                    "title": "Disconnect Main Utilities Immediately",
                    "description": "Turn off main electricity breaker, gas supply valve, and main water intake if instructed or before water enters your premises."
                },
                {
                    "title": "Evacuate Promptly to Higher Ground",
                    "description": "Do not delay evacuation to save bulky possessions. Move family and pets to the top floor or designated shelter."
                },
                {
                    "title": "Never Walk or Drive Through Floodwaters",
                    "description": "'Turn Around, Don't Drown'. Just 15 cm (6 in) of moving water can knock you down, and 30 cm (12 in) can carry away small vehicles."
                },
                {
                    "title": "Avoid Electrical Infrastructure",
                    "description": "Stay at least 10 meters away from submerged power lines, utility poles, transformers, and exposed wiring."
                }
            ],
            "doNot": [
                "Do NOT attempt to drive through flooded roads or submerged bridges.",
                "Do NOT touch electrical switches, cords, or appliances while standing in wet areas.",
                "Do NOT drink unboiled tap water or groundwater from flooded borewells.",
                "Do NOT allow children or pets to play in standing flood water."
            ]
        },
        "after": {
            "title": "Post-Disaster Recovery & Decontamination",
            "summary": "Safe protocols for re-entering flooded buildings and preventing secondary hazards.",
            "steps": [
                {
                    "title": "Inspect Structure Before Entering",
                    "description": "Check for exterior foundation cracks, sagging ceilings, loose drywall, and gas smell before stepping inside."
                },
                {
                    "title": "Certified Electrical Inspection",
                    "description": "Keep main electrical breakers OFF until certified electricians inspect wiring, switches, and submerged circuits."
                },
                {
                    "title": "Disinfect & Sanitize Everything",
                    "description": "Scrub walls, floors, and solid surfaces with bleach solution (1 cup bleach per 5 gallons water) to prevent toxic black mold."
                },
                {
                    "title": "Boil Drinking Water",
                    "description": "Boil all drinking and cooking water vigorously for at least 3 minutes or use certified halogen purification tablets."
                }
            ],
            "precautions": [
                "Watch out for venomous snakes, rodents, and insects seeking refuge in elevated corners of damaged structures.",
                "Discard all food items, pharmaceuticals, and baby formulas that came into contact with floodwater.",
                "Wear puncture-resistant boots and heavy rubber gloves during debris clearing.",
                "Photograph all structural and property damages for municipal disaster relief and insurance claims."
            ]
        },
        "precautions": {
            "dos": [
                "Keep a battery-operated transistor radio tuned to local emergency broadcast frequencies.",
                "Follow official evacuation orders issued by State & National Disaster Authorities immediately.",
                "Help vulnerable neighbors, elderly persons, and individuals with disabilities.",
                "Keep emergency cash reserves on hand as ATM networks and card terminals may fail."
            ],
            "donts": [
                "Do NOT swim across flooded canals, drains, or rapidly moving water streams.",
                "Do NOT eat any fresh crops or perishables submerged in flood debris.",
                "Do NOT spread unverified rumors on social media—rely exclusively on official command bulletins.",
                "Do NOT turn on gas appliances until lines are tested for leaks by authorized personnel."
            ]
        },
        "emergencyKit": {
            "survivalBasics": ["Potable water (4L/person/day for 3 days)", "Ready-to-eat emergency rations", "Multi-tool / Swiss army knife", "Emergency foil space blankets"],
            "medicalHygiene": ["First-aid kit (sterile gauze, antiseptic, bandages)", "Oral rehydration salts (ORS)", "Water purification tablets", "Prescription medications"],
            "powerComm": ["High-lumen waterproof LED torch", "Spare batteries (AA / AAA)", "Heavy-duty power bank", "Loud emergency whistle"],
            "documentsCash": ["Airtight waterproof document pouch", "Passports, Aadhaar, Insurance policies", "Emergency cash currency in small denominations"]
        }
    },

    "cyclone": {
        "disasterType": "Cyclone",
        "category": "Atmospheric / Tropical Storm",
        "severityRisk": "CRITICAL",
        "description": "Tropical cyclones are powerful storm systems characterized by rapid inward-spiraling winds, torrential rainfall, destructive storm surges, and localized squalls.",
        "icon": "Wind",
        "badgeColor": "#a855f7",
        "overview": {
            "primaryHazards": ["Gale-force winds (100-250+ km/h)", "Storm surges (3-6+ meters)", "Flying debris & shrapnel", "Uprooted trees & poles", "Flash flooding"],
            "vulnerableAreas": ["Coastal settlements", "Kutcha houses / thatched roofs", "Tall trees & billboard vicinities", "Harbors & fishing ports"]
        },
        "before": {
            "title": "Pre-Cyclone Alert Phase (48 - 24 Hours)",
            "summary": "Secure structural vulnerabilities, stock critical provisions, and monitor cyclone track bulletins.",
            "steps": [
                {
                    "title": "Secure Roofs & Trim Overhanging Trees",
                    "description": "Anchor loose asbestos/tin sheets with sandbags or wire ropes. Prune dead branches near power lines and rooftops."
                },
                {
                    "title": "Tape & Shutter Windows",
                    "description": "Board up windows or apply heavy-duty tape diagonally to prevent shattered glass shards during extreme pressure drops."
                },
                {
                    "title": "Store Emergency Potable Water",
                    "description": "Fill clean bathtubs, large buckets, and containers with potable water before municipal water supplies are cut off."
                },
                {
                    "title": "Relocate Coastal Livestock & Boats",
                    "description": "Move livestock to reinforced shelters inland. Pull fishing trawlers and boats above the maximum high-tide surge line."
                }
            ],
            "emergencyKit": [
                "Heavy-duty hurricane/cyclone storm lantern",
                "Non-perishable dry food supplies for 4-5 days",
                "Manual can opener",
                "Sturdy protective helmets and safety glasses",
                "Extra heavy-duty tarpaulins and nylon ropes",
                "Emergency battery radio / NOAA weather receiver"
            ],
            "checklist": [
                {"id": "cy_1", "text": "Inspect and anchor loose tin, tile, or asbestos roof sheets"},
                {"id": "cy_2", "text": "Board up or tape exterior glass windows and glass doors"},
                {"id": "cy_3", "text": "Prune heavy tree branches dangerously close to dwelling or power lines"},
                {"id": "cy_4", "text": "Fill clean water reservoirs and stock 5-day non-perishable food"},
                {"id": "cy_5", "text": "Keep battery-operated radio, torches, and power banks fully charged"},
                {"id": "cy_6", "text": "Identify designated cyclone shelter location and nearest safe evacuation path"},
                {"id": "cy_7", "text": "Store all vehicles in enclosed garages or away from trees and signboards"}
            ]
        },
        "during": {
            "title": "Cyclone Landfall Phase",
            "summary": "Remain locked indoors within the most structurally sound core room until the storm completely passes.",
            "steps": [
                {
                    "title": "Shelter in the Strongest Interior Room",
                    "description": "Stay in an interior room, hallway, or under a reinforced concrete stairway with no exterior windows."
                },
                {
                    "title": "Beware of the 'Eye of the Storm'",
                    "description": "If winds suddenly cease and the sky clears, DO NOT go outside. The lull is the storm's center (eye), and hurricane-force winds will violently resume in the opposite direction."
                },
                {
                    "title": "Shut Off Mains Supply",
                    "description": "Turn off gas cylinders and electrical circuit breakers to prevent fires caused by violent building vibration."
                },
                {
                    "title": "Protect Heads from Potential Collapses",
                    "description": "Keep mattresses, thick blankets, or cushions nearby to shield heads if roof damage occurs."
                }
            ],
            "doNot": [
                "Do NOT step outside during the temporary lull (storm eye).",
                "Do NOT stand near exterior glass windows or doors.",
                "Do NOT shelter under large trees, electric poles, or steel hoardings.",
                "Do NOT operate vehicles or motorbikes during landfall."
            ]
        },
        "after": {
            "title": "Post-Landfall Assessment",
            "summary": "Cautious protocols following cyclone passage and landfall deceleration.",
            "steps": [
                {
                    "title": "Wait for Official 'ALL CLEAR' Signal",
                    "description": "Do not leave shelters until the district disaster management authority officially declares the storm has passed."
                },
                {
                    "title": "Report Dangling Power Lines",
                    "description": "Stay at least 15 meters away from snapped wires and immediately alert emergency dispatch (112 / 1077)."
                },
                {
                    "title": "Drain Stagnant Water Around Home",
                    "description": "Eliminate open puddles and debris to curb aggressive post-storm mosquito breeding and vector epidemics."
                },
                {
                    "title": "Check Gas Lines Before Lighting Flames",
                    "description": "Smell for LPG/CNG gas leaks. Never light matchsticks or candles if you suspect a gas line rupture."
                }
            ],
            "precautions": [
                "Drive only if urgent—roads will be blocked by downed trees, snapped cables, and washed-out asphalt.",
                "Avoid touching wet electrical poles, street lamp posts, and metallic fences.",
                "Use antiseptic skin washes if exposed to storm debris or murky flood waters."
            ]
        },
        "precautions": {
            "dos": [
                "Stay tuned to National Disaster Management Authority (NDMA) / IMD bulletins on your battery radio.",
                "Keep emergency ID tags on small children and household pets.",
                "Keep first-aid kit, torches, and prescription meds within immediate arm's reach.",
                "Follow prompt evacuation directives if residing in storm-surge inundation zones."
            ],
            "donts": [
                "Do NOT venture to the beach or harbor to photograph or view high waves and storm surges.",
                "Do NOT enter damaged or partially collapsed structures.",
                "Do NOT touch fallen transformers, power lines, or metal barricades.",
                "Do NOT overload local phone lines with non-emergency voice calls—use SMS text messages."
            ]
        },
        "emergencyKit": {
            "survivalBasics": ["Drinking water (5-day reserve)", "Ready-to-eat calorie-dense rations", "Heavy-duty waterproof tarp", "Multi-purpose rope"],
            "medicalHygiene": ["Comprehensive emergency first-aid kit", "Water disinfection tablets", "Pain relievers & anti-diarrheal medication"],
            "powerComm": ["AM/FM Battery radio", "High-intensity LED headlamps & flashlights", "Spare lithium battery packs", "Emergency signalling whistle"],
            "documentsCash": ["Waterproof document container", "Government IDs, Property deeds", "Currency notes in small denominations"]
        }
    },

    "earthquake": {
        "disasterType": "Earthquake",
        "category": "Geophysical / Tectonic",
        "severityRisk": "CRITICAL",
        "description": "Sudden violent shaking of the ground caused by seismic waves passing through the Earth's crust along fault lines. Strikes with zero advance warning.",
        "icon": "Activity",
        "badgeColor": "#ef4444",
        "overview": {
            "primaryHazards": ["Building collapse", "Falling debris & glass", "Ruptured gas & water mains", "Soil liquefaction", "Aftershocks"],
            "vulnerableAreas": ["Unreinforced masonry structures", "High-rise glass facades", "Overpasses & flyovers", "Steep cliff slopes"]
        },
        "before": {
            "title": "Earthquake Hazard Mitigation & Household Safety",
            "summary": "Identify structural hazards and anchor heavy interior fixtures before tremors occur.",
            "steps": [
                {
                    "title": "Anchor Heavy Furniture & Appliances",
                    "description": "Fasten tall bookcases, cabinets, water heaters, and large mirrors securely to wall studs with L-brackets and safety straps."
                },
                {
                    "title": "Identify Safe Internal Spots in Every Room",
                    "description": "Locate sturdy wooden tables, desks, or interior load-bearing walls away from glass windows and hanging light fixtures."
                },
                {
                    "title": "Practice 'DROP, COVER, AND HOLD ON'",
                    "description": "Conduct household earthquake drills every 6 months so immediate reaction becomes second nature."
                },
                {
                    "title": "Learn Main Gas & Electrical Shutoff Valves",
                    "description": "Ensure all adult family members know how and where to shut off gas cylinders, main water meters, and circuit breakers."
                }
            ],
            "emergencyKit": [
                "Sturdy work gloves and steel-toe/heavy boots (to walk over broken glass)",
                "Dust masks (N95 rated) to filter airborne concrete and masonry dust",
                "Adjustable wrench or crescent tool to shut off utilities",
                "Loud rescue whistle to signal search & rescue teams under rubble",
                "Compact first-aid kit with tourniquet and pressure dressings"
            ],
            "checklist": [
                {"id": "eq_1", "text": "Anchor heavy wardrobes, bookshelves, and refrigerators to wall studs"},
                {"id": "eq_2", "text": "Place heavy objects and breakables on low, closed-latch shelves"},
                {"id": "eq_3", "text": "Practice 'Drop, Cover, and Hold On' drill with all family members"},
                {"id": "eq_4", "text": "Keep sturdy shoes, thick socks, and a flashlight beside every bed"},
                {"id": "eq_5", "text": "Identify open-ground assembly area away from buildings and overhead cables"},
                {"id": "eq_6", "text": "Know the location and operation of main electrical and gas shut-off valves"},
                {"id": "eq_7", "text": "Stock N95 dust masks, work gloves, and emergency medical trauma supplies"}
            ]
        },
        "during": {
            "title": "Active Seismic Shaking Phase",
            "summary": "Take immediate self-protective posture inside 3 seconds.",
            "steps": [
                {
                    "title": "DROP, COVER, AND HOLD ON",
                    "description": "DROP onto your hands and knees. COVER your head and neck under a sturdy table or desk. HOLD ON to your shelter until shaking stops."
                },
                {
                    "title": "If Indoors: Stay Indoors",
                    "description": "Do NOT rush for exit doors or stairways during shaking. Most injuries occur from falling exterior masonry and shatter glass."
                },
                {
                    "title": "If Outdoors: Move to Open Ground",
                    "description": "Move away from buildings, streetlights, overhead power cables, and flyovers. Drop to ground and protect head."
                },
                {
                    "title": "If Driving: Pull Over Safely",
                    "description": "Slowly pull over away from overpasses, bridges, tunnels, and trees. Keep seatbelt fastened until shaking ceases."
                }
            ],
            "doNot": [
                "Do NOT use elevators or lifts under any circumstances.",
                "Do NOT stand in doorways—modern doorways are not stronger than the rest of the structure.",
                "Do NOT run outside while tremors and falling tiles are actively occurring.",
                "Do NOT ignite lighters, matches, or stoves due to potential severed gas pipes."
            ]
        },
        "after": {
            "title": "Immediate Post-Earthquake Actions",
            "summary": "Evacuate systematically, inspect for gas leaks, and prepare for strong aftershocks.",
            "steps": [
                {
                    "title": "Put on Sturdy Shoes Immediately",
                    "description": "Wear thick-soled shoes and work gloves before moving to protect feet and hands from shattered glass and nails."
                },
                {
                    "title": "Check for Injuries & Gas Leaks",
                    "description": "Administer first aid for bleeding. If you smell gas or hear hissing, turn off cylinder/main valve and evacuate immediately."
                },
                {
                    "title": "Expect Severe Aftershocks",
                    "description": "Be prepared to 'Drop, Cover, and Hold On' again during aftershocks, which can cause compromised buildings to collapse."
                },
                {
                    "title": "Use Stairs Only for Evacuation",
                    "description": "Descend via exterior fire escape or stairs carefully, testing structural solidity of steps."
                }
            ],
            "precautions": [
                "Do not re-enter cracked or tilted buildings until structural engineers declare them safe.",
                "Open cabinet doors cautiously as interior contents may have shifted and could fall.",
                "Stay clear of chimney stacks, parapets, and exterior decorative masonry.",
                "Conserve cellular network bandwidth for critical emergency 112 distress calls."
            ]
        },
        "precautions": {
            "dos": [
                "Drop to your hands and knees immediately when tremor begins.",
                "Cover your head and neck with arms, a thick pillow, or beneath heavy furniture.",
                "Help extinguish small incipient fires with fire extinguishers before they spread.",
                "Listen to official civil defense updates on battery-operated radio."
            ],
            "donts": [
                "Do NOT dash into stairwells or stampede toward elevators during active shaking.",
                "Do NOT touch fallen overhead electric wires or metal fences touching them.",
                "Do NOT use open flames or candles—use battery-operated LED flashlights exclusively.",
                "Do NOT enter damaged buildings to retrieve non-essential personal belongings."
            ]
        },
        "emergencyKit": {
            "survivalBasics": ["Water bottles (3-day minimum)", "Compact high-calorie food bars", "Heavy leather work gloves", "Steel-shank puncture-resistant boots"],
            "medicalHygiene": ["Trauma dressings & sterile compresses", "N95 particulate dust masks", "Splinting materials & antiseptic", "Essential prescription medicine"],
            "powerComm": ["High-decibel emergency rescue whistle", "LED headlamp with spare batteries", "Solar / crank emergency power bank"],
            "documentsCash": ["Airtight emergency document case", "Copies of deeds, IDs, emergency numbers", "Cash reserve in small bills"]
        }
    },

    "fire": {
        "disasterType": "Fire",
        "category": "Thermal / Structural & Wildfire",
        "severityRisk": "HIGH",
        "description": "Rapidly spreading combustion that consumes structures, vegetation, and assets. Produces toxic carbon monoxide smoke, superheated gases, and rapid oxygen depletion.",
        "icon": "Flame",
        "badgeColor": "#f97316",
        "overview": {
            "primaryHazards": ["Toxic smoke inhalation", "Extreme thermal burns", "Rapid structural flashover", "Explosive gas cylinders", "Oxygen depletion"],
            "vulnerableAreas": ["Kitchens & gas hookups", "Overloaded electrical panels", "High-density timber housing", "Forest urban-interface zones"]
        },
        "before": {
            "title": "Fire Prevention & Early Warning Setup",
            "summary": "Proactive prevention, fire detection hardware installation, and escape route mapping.",
            "steps": [
                {
                    "title": "Install & Test Smoke Alarms",
                    "description": "Place photoelectric smoke detectors inside every bedroom, living area, and adjacent to kitchen exits. Test monthly."
                },
                {
                    "title": "Maintain Portable Fire Extinguishers",
                    "description": "Keep ABC-rated dry chemical fire extinguishers in the kitchen, garage, and each floor. Inspect pressure gauge quarterly."
                },
                {
                    "title": "Establish 2 Clear Escape Routes per Room",
                    "description": "Ensure windows and security grilles can be opened swiftly from the inside without complex tools."
                },
                {
                    "title": "Clear Defensible Space Around Structure",
                    "description": "For wildfire zones, clear dry leaves, brush, firewood piles, and flammable clutter within 10 meters (30 ft) of the home."
                }
            ],
            "emergencyKit": [
                "Emergency fire escape smoke hoods / particulate respirators",
                "Fire-resistant emergency burn blanket",
                "ABC Dry Powder Multi-Purpose Fire Extinguisher",
                "Heavy cotton cloths (for wetting and covering airway)",
                "Heat-resistant heavy leather safety gloves",
                "High-intensity smoke-piercing emergency torch"
            ],
            "checklist": [
                {"id": "fr_1", "text": "Install and test smoke detectors on every floor and inside bedrooms"},
                {"id": "fr_2", "text": "Place certified ABC fire extinguisher in kitchen and near electrical mains"},
                {"id": "fr_3", "text": "Ensure two unblocked escape exits from every living space and bedroom"},
                {"id": "fr_4", "text": "Store flammable liquids (kerosene, spirits, solvents) in approved metal safety cans"},
                {"id": "fr_5", "text": "Keep matches, lighters, and fireworks locked away from children"},
                {"id": "fr_6", "text": "Check electrical cords and avoid overloading extension power strips"},
                {"id": "fr_7", "text": "For wildfire zones: clear dry brush within 10 meters of house perimeter"}
            ]
        },
        "during": {
            "title": "Emergency Evacuation & Smoke Escape",
            "summary": "Evacuate immediately without pausing to gather possessions. Crawl low under smoke.",
            "steps": [
                {
                    "title": "CRAWL LOW UNDER SMOKE",
                    "description": "Toxic smoke and superheated air rise to the ceiling. Crawl on your hands and knees where breathable clean air remains (bottom 30 cm)."
                },
                {
                    "title": "Feel Doors with Back of Hand Before Opening",
                    "description": "If door or metal handle feels hot, DO NOT open it—deadly fire is on the other side. Use alternative escape route."
                },
                {
                    "title": "STOP, DROP, AND ROLL if Clothes Catch Fire",
                    "description": "Do NOT run (running feeds flames with oxygen). Immediately STOP, DROP to the ground, and ROLL back and forth covering your face."
                },
                {
                    "title": "Call 101 / 112 from Outside",
                    "description": "Once outside at safe assembly point, call the Fire Brigade immediately. Never go back inside a burning building."
                }
            ],
            "doNot": [
                "Do NOT use elevators—shafts act as natural chimneys for smoke and power can cut out instantly.",
                "Do NOT re-enter a burning structure for pets, jewelry, cash, or documents.",
                "Do NOT throw water on grease or electrical fires (use baking soda or ABC extinguisher).",
                "Do NOT hide inside closets or under beds where rescue firefighters cannot easily locate you."
            ]
        },
        "after": {
            "title": "Post-Fire Safety & Scene Management",
            "summary": "Protocols for burn treatment, structural re-entry, and damage documentation.",
            "steps": [
                {
                    "title": "Administer First Aid for Burns",
                    "description": "Cool thermal burns immediately with clean, cool running water for 10-15 minutes. Do NOT apply butter, oils, or ice."
                },
                {
                    "title": "Do Not Enter Until Cleared by Fire Officers",
                    "description": "Smoldering embers in wall voids or attic rafters can reignite hours after flames are knocked down."
                },
                {
                    "title": "Discard Heat-Damaged Food & Medication",
                    "description": "Discard any canned food, beverages, or pharmaceuticals exposed to heat, smoke fumes, or chemical fire retardants."
                },
                {
                    "title": "Notify Insurance & Utility Providers",
                    "description": "Document burned areas with photos once safe, and notify your municipal electrical and gas boards."
                }
            ],
            "precautions": [
                "Watch for weakened floorboards, collapsed ceiling plaster, and dangling overhead pipes.",
                "Wear heavy N95/FFP2 masks and gloves during post-fire cleanup to avoid inhaling toxic soot ash.",
                "Keep electrical panels locked out until inspected by licensed master electricians."
            ]
        },
        "precautions": {
            "dos": [
                "Get out and stay out as soon as a fire alarm sounds.",
                "Crawl low under smoke on your hands and knees.",
                "Close doors behind you as you exit to slow down fire spread.",
                "Gather at a designated family meeting spot outside."
            ],
            "donts": [
                "Do NOT try to fight a rapidly spreading or large fire yourself—evacuate immediately.",
                "Do NOT open hot doors or doors with smoke seeping through crevices.",
                "Do NOT use water on electrical or oil grease kitchen fires.",
                "Do NOT go back inside for any reason until fire commanders give the all-clear."
            ]
        },
        "emergencyKit": {
            "survivalBasics": ["Emergency smoke escape hoods", "Fire safety blanket", "Heavy-duty leather work gloves", "Drinking water & ORS"],
            "medicalHygiene": ["Sterile burn dressings & hydrogel sheets", "Antiseptic wipes & sterile gauze rolls", "Pain relief analgesics", "Eye wash solution"],
            "powerComm": ["Smoke-penetrating LED torch", "Emergency high-frequency whistle", "Charged power bank"],
            "documentsCash": ["Fireproof document safe / pouch", "Passport copies & insurance cards", "Emergency cash reserve"]
        }
    },

    "landslide": {
        "disasterType": "Landslide",
        "category": "Geological / Mass Movement",
        "severityRisk": "HIGH",
        "description": "Downslope movement of rock, earth, and debris triggered by heavy monsoon rains, seismic shaking, deforestation, or slope destabilization.",
        "icon": "Mountain",
        "badgeColor": "#eab308",
        "overview": {
            "primaryHazards": ["Rapid debris flow & mudslides", "Buried roads & bridges", "Crushed buildings", "Damming of rivers", "Secondary flash floods"],
            "vulnerableAreas": ["Steep mountain slopes", "Old drainage channels", "Base of cut slopes & quarries", "Hill roadsides"]
        },
        "before": {
            "title": "Slope Assessment & Warning Sign Monitoring",
            "summary": "Inspect terrain around hill slopes, improve slope drainage, and observe early geological indicators.",
            "steps": [
                {
                    "title": "Monitor Early Warning Signs",
                    "description": "Watch for tilting trees, new cracks in ground or foundation, sticking doors/windows, and water bubbling up in new hillside spots."
                },
                {
                    "title": "Install Flexible Drainage & Retaining Walls",
                    "description": "Ensure surface runoff is channeled away from steep slope crests into lined catchment drains."
                },
                {
                    "title": "Avoid Excavating Hill Bases",
                    "description": "Never cut into the toe of a steep slope for unauthorized parking, expansion, or agriculture without retaining engineering."
                },
                {
                    "title": "Identify Safe Evacuation Zone Off-Slope",
                    "description": "Locate an evacuation center situated on stable flat ground, far away from mountain gullies and natural chutes."
                }
            ],
            "emergencyKit": [
                "Sturdy mountain trekking boots with deep grip",
                "High-output halogen/LED flashlight for night evacuation",
                "Heavy-duty rain ponchos and thermal protective clothing",
                "Foldable shovel and multi-purpose survival spade",
                "Compact emergency survival shelter / bivy sack"
            ],
            "checklist": [
                {"id": "ls_1", "text": "Inspect exterior ground, retaining walls, and pathways for widening cracks"},
                {"id": "ls_2", "text": "Check if utility poles, boundary walls, or trees have begun tilting downhill"},
                {"id": "ls_3", "text": "Keep roof runoff and surface gutters clear and diverted away from slope crests"},
                {"id": "ls_4", "text": "Listen for unusual rumbling sounds or cracking tree sounds during intense rain"},
                {"id": "ls_5", "text": "Map safe evacuation route to flat, geologically stable ground away from gullies"},
                {"id": "ls_6", "text": "Keep packed emergency bug-out bag by main exit during continuous heavy rainfall"},
                {"id": "ls_7", "text": "Cooperate promptly with district administration landslide evacuation advisories"}
            ]
        },
        "during": {
            "title": "Active Landslide & Mudflow Response",
            "summary": "Fast lateral movement away from debris path. Never attempt to outrun debris down a gully.",
            "steps": [
                {
                    "title": "MOVE LATERAL (Perpendicular) to Debris Path",
                    "description": "If you hear loud rumbling or see moving mud, run sideways (perpendicular) to the flow direction toward higher, stable ridgelines."
                },
                {
                    "title": "Avoid River Valleys & Low-Lying Channels",
                    "description": "Debris flows naturally funnel into stream channels and gullies at highway speeds (50+ km/h). Get onto high ridgelines immediately."
                },
                {
                    "title": "If Trapped Indoors: Curl into Ball Under Furniture",
                    "description": "Curl into a tight fetal ball, protect your head with a thick blanket or mattress under heavy reinforced furniture."
                },
                {
                    "title": "Watch for Sudden River Level Drops",
                    "description": "A sudden drop in streamflow indicates an upstream landslide dam that can breach catastrophically with zero warning."
                }
            ],
            "doNot": [
                "Do NOT attempt to cross flowing mud or boulder debris on foot or by vehicle.",
                "Do NOT sleep in ground-floor downhill rooms during torrential monsoon downpours.",
                "Do NOT stay near the bottom of steep slopes or cliff edges when earth movement begins.",
                "Do NOT cross bridges if high-velocity mud and tree debris are battering the pilings."
            ]
        },
        "after": {
            "title": "Post-Landslide Recovery & Hazard Inspection",
            "summary": "Watch for secondary slope failures and aid search & rescue without entering unstable zones.",
            "steps": [
                {
                    "title": "Stay Away from Slide Zone",
                    "description": "Additional slides can occur hours or days after the primary event due to altered groundwater pressures."
                },
                {
                    "title": "Check for Trapped & Injured Persons",
                    "description": "Direct search & rescue teams (NDRF 1077 / 112) to trapped victims without stepping onto unstable slide talus yourself."
                },
                {
                    "title": "Inspect Foundation & Utility Lines",
                    "description": "Check for broken gas, water, and electrical connections around remaining buildings and report promptly."
                },
                {
                    "title": "Replant Damaged Ground",
                    "description": "Plant fast-growing deep-rooted native vegetation and install geo-textiles to prevent ongoing erosion."
                }
            ],
            "precautions": [
                "Be alert for flash floods that frequently follow debris dams when temporary blockages burst.",
                "Do not drive on hill roads until state highway engineers survey retaining walls and culverts.",
                "Report new surface cracks or tilting trees immediately to local geological survey officers."
            ]
        },
        "precautions": {
            "dos": [
                "Evacuate immediately if you hear trees snapping, rocks knocking together, or a roaring freight-train sound.",
                "Stay awake and alert during intense, prolonged cloudburst rainstorms.",
                "Help elderly and mobility-impaired neighbors evacuate up-slope or to community centers.",
                "Follow official route closures and barricades placed by traffic police."
            ],
            "donts": [
                "Do NOT build settlements on steep hillside shoulders or historic debris fan channels.",
                "Do NOT return to a landslide-hit area until certified geologists declare slopes stable.",
                "Do NOT dig into unstable mud piles without proper shoring and professional rescue equipment.",
                "Do NOT ignore early signs like sudden sticking of doorframes and cracking exterior pavement."
            ]
        },
        "emergencyKit": {
            "survivalBasics": ["Sturdy grip mountain boots", "Heavy waterproof poncho", "Thermal blanket", "High-energy energy bars & water"],
            "medicalHygiene": ["Trauma dressings & splints", "Antiseptic wash & bandages", "Water purification drops"],
            "powerComm": ["High-lumen search torch", "Emergency radio", "Whistle & signalling mirror", "Power bank"],
            "documentsCash": ["Waterproof document pouch", "Emergency cash & personal identification"]
        }
    },

    "tsunami": {
        "disasterType": "Tsunami",
        "category": "Oceanic / Seismic Sea Wave",
        "severityRisk": "CRITICAL",
        "description": "Series of powerful oceanic waves generated by undersea earthquakes, volcanic eruptions, or submarine landslides. Waves travel across oceans at aircraft speeds and inundate coastlines.",
        "icon": "Waves",
        "badgeColor": "#06b6d4",
        "overview": {
            "primaryHazards": ["Inundating massive wave walls", "Violent drag currents", "Floating debris impact", "Complete coastal destruction", "Saltwater contamination"],
            "vulnerableAreas": ["Beaches & coastal plains", "River mouths & estuaries", "Low-lying islands", "Harbors & marinas"]
        },
        "before": {
            "title": "Coastal Preparedness & Natural Warning Signs",
            "summary": "Recognize nature's tsunami warning signs and memorize high-ground evacuation routes.",
            "steps": [
                {
                    "title": "Know Nature's Tsunami Warnings",
                    "description": "A severe coastal earthquake, a roaring oceanic sound, or a sudden, rapid sea withdrawal exposing the sea floor means a tsunami is imminent within minutes."
                },
                {
                    "title": "Map Evacuation to 30+ Meters Elevation",
                    "description": "Locate high ground at least 30 meters (100 feet) above sea level, or at least 3 km (2 miles) inland from the beach."
                },
                {
                    "title": "Identify Tsunami Evacuation Buildings",
                    "description": "Identify multi-story reinforced concrete structures (5+ stories) designated for vertical evacuation if high ground is unreachable."
                },
                {
                    "title": "Never Go to the Beach to Watch",
                    "description": "If you can see the tsunami wave coming, you are already too close to safely outrun it on foot."
                }
            ],
            "emergencyKit": [
                "Life jackets / personal flotation devices for all family members",
                "Compact emergency survival backpack with 72-hr essentials",
                "High-frequency rescue whistle attached to clothing",
                "Waterproof floating container for identification and deeds",
                "Luminescent chemical glow sticks and waterproof LED beacon"
            ],
            "checklist": [
                {"id": "ts_1", "text": "Memorize the 3 Natural Warning Signs: Ground Shake, Loud Ocean Roar, Sea Withdrawal"},
                {"id": "ts_2", "text": "Map pedestrian evacuation route to high ground (30m+ elevation or 3km+ inland)"},
                {"id": "ts_3", "text": "Locate reinforced concrete vertical evacuation structures in low-lying coastal zone"},
                {"id": "ts_4", "text": "Keep life jackets and buoyant emergency gear readily accessible"},
                {"id": "ts_5", "text": "Store critical documents in floating waterproof dry bags"},
                {"id": "ts_6", "text": "Establish coastal family assembly point located inland outside inundation zone"},
                {"id": "ts_7", "text": "Sign up for coastal early warning system and INCOIS / NOAA alert feeds"}
            ]
        },
        "during": {
            "title": "Immediate Inundation Action",
            "summary": "Run immediately inland and uphill on foot. Do not wait for official siren confirmations if sea retreats.",
            "steps": [
                {
                    "title": "RUN INLAND & UPHILL IMMEDIATELY",
                    "description": "Evacuate on foot to avoid road gridlock. Move quickly toward higher ground (hills, multi-story reinforced concrete roofs)."
                },
                {
                    "title": "Expect Multiple Destructive Waves",
                    "description": "A tsunami is a SERIES of waves hours apart. The first wave is rarely the largest—subsequent waves can be much more destructive."
                },
                {
                    "title": "If Trapped in Water: Grab Floating Debris",
                    "description": "If swept up by a wave, grab onto a sturdy floating object (tree trunk, roof, log) and hold on tightly."
                },
                {
                    "title": "Stay Put for at least 6-12 Hours",
                    "description": "Remain on high ground until state disaster authorities officially declare the coastal surge series over."
                }
            ],
            "doNot": [
                "Do NOT go to the shore to watch the sea retreat or collect exposed fish.",
                "Do NOT use cars for evacuation in dense coastal towns—traffic jams trap occupants in wave paths.",
                "Do NOT return to the coastline after the first wave recedes.",
                "Do NOT shelter in wooden, thatched, or single-story coastal cottages."
            ]
        },
        "after": {
            "title": "Post-Tsunami Coastal Safety",
            "summary": "Avoid receding current hazards, check for water contamination, and assist emergency teams.",
            "steps": [
                {
                    "title": "Wait for the Official 'ALL CLEAR'",
                    "description": "Do not return to port areas or beaches until INCOIS / Disaster Management Authority gives explicit clearance."
                },
                {
                    "title": "Avoid Receding Floodwaters",
                    "description": "Receding tsunami waters carry dangerous submerged debris, sharp iron rods, and strong suction into the sea."
                },
                {
                    "title": "Strictly Drink Purified Bottled Water",
                    "description": "Coastal wells and city pipes are contaminated with seawater, sewage, and chemical sludge."
                },
                {
                    "title": "Stay Out of Damaged Coastal Buildings",
                    "description": "Wave impact scours foundation soil, making buildings susceptible to delayed sudden collapse."
                }
            ],
            "precautions": [
                "Wear heavy footwear and gloves to prevent severe cuts from coral and metal debris.",
                "Watch out for ruptured fuel lines, marine gas leaks, and floating hazard containers.",
                "Help emergency teams locate missing persons along designated relief corridors."
            ]
        },
        "precautions": {
            "dos": [
                "Flee to high ground the instant you feel strong coastal shaking or see sudden sea retreat.",
                "Evacuate on foot using designated pedestrian tsunami evacuation routes.",
                "Listen for official siren broadcasts and maritime alerts.",
                "Help children, pregnant mothers, and elderly persons reach high ground."
            ],
            "donts": [
                "Do NOT wait for official warnings if natural signs (sea retreat, earthquake) occur.",
                "Do NOT attempt to ride out a tsunami in a boat near the shoreline (ships should head to deep sea 100m+ depth).",
                "Do NOT touch water-damaged electrical appliances or submerged transformers.",
                "Do NOT consume seafood or agricultural crops flooded by tsunami seawater."
            ]
        },
        "emergencyKit": {
            "survivalBasics": ["Personal flotation life vest", "Sealed drinking water pouches (3 days)", "Emergency high-calorie energy bars", "Waterproof dry pack"],
            "medicalHygiene": ["Emergency trauma first aid kit", "Antiseptic solutions & bandages", "Water purification tablets"],
            "powerComm": ["High-intensity waterproof emergency strobe", "Loud survival whistle", "Solar hand-crank emergency radio"],
            "documentsCash": ["Floating waterproof document safe", "Passport, ID card copies", "Emergency cash in waterproof wrap"]
        }
    },

    "heatwave": {
        "disasterType": "Heatwave",
        "category": "Climatological / Thermal Extreme",
        "severityRisk": "MEDIUM",
        "description": "Prolonged period of excessively hot weather, frequently accompanied by high relative humidity (dangerous wet-bulb temperature), causing severe heat exhaustion and fatal heatstroke.",
        "icon": "Sun",
        "badgeColor": "#f59e0b",
        "overview": {
            "primaryHazards": ["Exertional & classic heatstroke", "Severe dehydration", "Electrolyte collapse", "Cardiovascular stress", "Power grid brownouts"],
            "vulnerableAreas": ["Outdoor laborers & farmers", "Infants & elderly citizens", "Top-floor tin/asbestos roof dwellings", "Dense urban heat islands"]
        },
        "before": {
            "title": "Heat Wave Preparation & Home Cooling",
            "summary": "Prepare hydration strategies, shade living spaces, and check cooling equipment before peak summer spikes.",
            "steps": [
                {
                    "title": "Insulate & Shade Roofs & Windows",
                    "description": "Apply white reflective solar paint (cool roof coating) on rooftops and install dark thermal curtains or bamboo blinds on sun-facing windows."
                },
                {
                    "title": "Stock Hydration & Electrolytes",
                    "description": "Keep ample stocks of Oral Rehydration Salts (ORS), coconut water, lemon water, and clean drinking water."
                },
                {
                    "title": "Schedule Outdoor Work for Early Mornings",
                    "description": "Reschedule strenuous outdoor tasks and physical labor to early morning (before 10 AM) or late evening (after 5 PM)."
                },
                {
                    "title": "Ensure Cooling Equipment Works",
                    "description": "Service fans, air coolers, and refrigerators before summer. Keep backup ice packs in freezers."
                }
            ],
            "emergencyKit": [
                "Packets of Oral Rehydration Salts (ORS) & glucose powder",
                "Wide-brimmed cotton sun hats and UV-protection sunglasses",
                "Light-colored, loose-fitting breathable cotton clothing",
                "Insulated water bottles (1.5L - 2L)",
                "Instant cooling gel ice packs (for armpits/neck during heat emergencies)",
                "Digital body thermometer"
            ],
            "checklist": [
                {"id": "hw_1", "text": "Stock ORS packets, glucose, lemon, and electrolyte hydration supplies"},
                {"id": "hw_2", "text": "Cover sun-facing windows with heavy drapes, blinds, or solar-reflective films"},
                {"id": "hw_3", "text": "Clean and test ceiling fans, evaporative air coolers, and water refrigerators"},
                {"id": "hw_4", "text": "Equip family with wide-brimmed sun hats, umbrellas, and UV sunglasses"},
                {"id": "hw_5", "text": "Plan daily outdoor chores strictly outside peak sunshine hours (11 AM - 4 PM)"},
                {"id": "hw_6", "text": "Check on elderly relatives and neighbors living alone twice daily"},
                {"id": "hw_7", "text": "Keep pets in shaded, well-ventilated areas with fresh, cool water accessible"}
            ]
        },
        "during": {
            "title": "Peak Heat Action & Hydration Protocol",
            "summary": "Stay indoors during peak sunlight hours (11:00 AM – 4:00 PM), drink continuous water, and recognize heat exhaustion early.",
            "steps": [
                {
                    "title": "Hydrate Constantly Even if Not Thirsty",
                    "description": "Drink at least 3 to 4 liters of water per day. Sip ORS, buttermilk, and coconut water regularly to replenish lost salts."
                },
                {
                    "title": "Stay Indoors During Peak Hours (11 AM - 4 PM)",
                    "description": "Avoid stepping into direct sunlight. If you must go outside, carry an umbrella, wear a wide hat, and use wet cotton cloths on your neck."
                },
                {
                    "title": "Recognize Heatstroke Symptoms",
                    "description": "High body temp (104°F / 40°C+), hot red dry skin (no sweating), rapid pulse, confusion, or fainting requires IMMEDIATE medical emergency care (call 108 / 112)."
                },
                {
                    "title": "Immediate First Aid for Heat Exhaustion",
                    "description": "Move the person to a cool, air-conditioned room. Apply cold wet towels or ice packs to armpits, neck, and groin. Fan vigorously."
                }
            ],
            "doNot": [
                "Do NOT leave children, disabled individuals, or pets inside parked closed vehicles—internal temp reaches 60°C within 10 minutes.",
                "Do NOT consume alcohol, heavily caffeinated energy drinks, or high-sugar sodas (they worsen dehydration).",
                "Do NOT perform intense physical exercise or sports under the direct midday sun.",
                "Do NOT wear dark, heavy, tight synthetic fabrics."
            ]
        },
        "after": {
            "title": "Post-Heatwave Recovery & Wellness",
            "summary": "Rebalance electrolytes, treat heat cramps, and adapt routine after extreme temperatures subside.",
            "steps": [
                {
                    "title": "Re-establish Full Electrolyte Balance",
                    "description": "Continue drinking mineral-rich fluids and eating light, water-dense fruits (watermelon, cucumbers, oranges)."
                },
                {
                    "title": "Monitor for Delayed Heat Illness",
                    "description": "Watch for persistent headaches, muscle cramps, dizziness, or dark-colored urine indicating ongoing kidney strain."
                },
                {
                    "title": "Gradual Re-acclimatization",
                    "description": "Gradually increase outdoor physical exertion over several days rather than jumping straight into intense labor."
                },
                {
                    "title": "Maintain Hydration Stations",
                    "description": "Maintain community water pots / earthen matkas outside homes for delivery workers, birds, and community animals."
                }
            ],
            "precautions": [
                "Avoid icy cold showers immediately after coming from extreme heat—can trigger vascular shock; use lukewarm water instead.",
                "Ensure infants and elderly individuals stay in the coolest ground-floor rooms.",
                "Seek medical attention if vomiting or dizziness persists longer than 1 hour."
            ]
        },
        "precautions": {
            "dos": [
                "Drink plenty of water, buttermilk, lassi, and ORS solution throughout the day.",
                "Wear loose, light-colored, 100% breathable cotton clothing.",
                "Cover your head with a cloth, hat, or umbrella when in sunlight.",
                "Keep water bowls in balconies and gardens for birds and stray animals."
            ],
            "donts": [
                "Do NOT step outside bareheaded or barefoot during peak noon hours.",
                "Do NOT drink unhygienic roadside ice water or unpasteurized drinks.",
                "Do NOT consume protein-heavy, fried, or stale food that increases metabolic body heat.",
                "Do NOT ignore signs like dizziness, nausea, and reduced urination."
            ]
        },
        "emergencyKit": {
            "survivalBasics": ["Insulated thermo-flask water bottle", "Wide-brimmed cotton sun hat", "UV400 protective sunglasses", "Pocket cooling fan"],
            "medicalHygiene": ["Oral Rehydration Salts (ORS) packets", "Instant cold compress packs", "Digital clinical thermometer", "Electrolyte effervescent tablets"],
            "powerComm": ["Rechargeable portable misting fan", "Mobile power bank"],
            "documentsCash": ["Medical emergency contacts list", "Health insurance cards"]
        }
    }
}


DEFAULT_HELPLINES = [
    {"name": "National Emergency Number", "number": "112", "description": "All-in-one emergency dispatch (Police, Fire, Medical)"},
    {"name": "NDRF Disaster Helplines", "number": "1077 / 1078", "description": "National Disaster Response Force Command Desk"},
    {"name": "State Disaster Control Room (SDMA)", "number": "1070", "description": "State Emergency Operations Center (SEOC)"},
    {"name": "Ambulance & Medical Emergency", "number": "108", "description": "Emergency medical technician & trauma ambulance"},
    {"name": "Fire & Rescue Services", "number": "101", "description": "Urban and rural fire suppression dispatch"},
    {"name": "Police Control Room", "number": "100", "description": "Law enforcement & public security assistance"}
]


def get_all_safety_types():
    """Return list of supported disaster types with basic metadata."""
    types_list = []
    for key, data in SAFETY_KNOWLEDGE_BASE.items():
        types_list.append({
            "id": key,
            "name": data["disasterType"],
            "category": data["category"],
            "severityRisk": data["severityRisk"],
            "description": data["description"],
            "icon": data["icon"],
            "badgeColor": data["badgeColor"]
        })
    return types_list


def get_safety_by_type(disaster_type: str):
    """
    Retrieve safety knowledge profile for a specific disaster type.
    Matches case-insensitively, supporting both 'flood' and 'Flood' or 'wildfire'/'fire'.
    """
    if not disaster_type:
        return None
        
    lookup = disaster_type.strip().lower()
    
    # Direct match
    data = None
    if lookup in SAFETY_KNOWLEDGE_BASE:
        data = dict(SAFETY_KNOWLEDGE_BASE[lookup])
    else:
        # Synonyms / Aliases
        aliases = {
            "wildfire": "fire",
            "forest fire": "fire",
            "urban flood": "flood",
            "flash flood": "flood",
            "cyclone alert": "cyclone",
            "hurricane": "cyclone",
            "typhoon": "cyclone",
            "mudslide": "landslide",
            "tremor": "earthquake",
            "seismic": "earthquake",
            "heat wave": "heatwave",
            "heat-wave": "heatwave",
            "heat_wave": "heatwave",
            "drought": "heatwave"
        }
        if lookup in aliases and aliases[lookup] in SAFETY_KNOWLEDGE_BASE:
            data = dict(SAFETY_KNOWLEDGE_BASE[aliases[lookup]])
            
    if data:
        if "helplines" not in data or not data["helplines"]:
            data["helplines"] = DEFAULT_HELPLINES
        return data
        
    return None
