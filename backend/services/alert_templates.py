def get_public_template(severity: str, location: str = "NH-13", lang: str = "en"):
    templates = {
        "Critical": {
            "en": f"CRITICAL LANDSLIDE RISK on {location}. Avoid travel immediately.",
            "hi": f"{location} पर गंभीर भूस्खलन की चेतावनी। यात्रा से बचें।",
            "as": f"{location} ত গুৰুতৰ ভূমিস্খলনৰ আশংকা। ভ্ৰমণৰ পৰা বিৰত থাকক।"
        },
        "High": {
            "en": f"High Landslide Risk on {location}. Drive with extreme caution.",
            "hi": f"{location} पर उच्च भूस्खलन का जोखिम। सावधानी से ड्राइव करें।",
            "as": f"{location} ত উচ্চ ভূমিস্খলনৰ আশংকা। সাৱধানে গাড়ী চলাওক।"
        }
    }
    
    # Fallback to English if lang or severity is missing
    return templates.get(severity, templates["High"]).get(lang, templates.get(severity, templates["High"])["en"])

def get_authority_template(prediction: dict, verification: dict, location: str = "NH-13"):
    return (
        f"AUTHORITY ALERT: {prediction['severity_tier']} Risk at {location}.\n"
        f"Probability: {prediction['probability']:.2f}\n"
        f"Confidence: {verification['confidence_score']:.2f}\n"
        f"Action: {verification['recommendation']['action']}"
    )
