import sys
import os
import re

sys.path.append(r"d:\disaster-management-system-main\disaster-management-system-main\backend")
from database import SessionLocal
import models
from rakshabot_service import _extract_query_entities

test_queries = [
    "What disasters are happening right now?",
    "Are there active floods near Kochi?",
    "What is the weather and flood risk in Kochi?",
    "What training programs are available for floods?",
    "What should I do during an earthquake?"
]

print("=== INTENT EXTRACTION TEST ===")
for q in test_queries:
    ent = _extract_query_entities(q)
    print(f"\nQuery: '{q}'")
    for k, v in ent.items():
        if v:
            print(f"  {k}: {v}")
