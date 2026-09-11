import exifread
import math

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def convert_to_degrees(value):
    """Helper function to convert the GPS coordinates stored in the EXIF to degress in float format"""
    d0 = value.values[0].num; d1 = value.values[0].den
    m0 = value.values[1].num; m1 = value.values[1].den
    s0 = value.values[2].num; s1 = value.values[2].den

    d = float(d0) / float(d1)
    m = float(m0) / float(m1)
    s = float(s0) / float(s1)

    return d + (m / 60.0) + (s / 3600.0)

def extract_gps_from_exif(image_path: str):
    """Returns (lat, lon) from image EXIF, or (None, None) if not found."""
    with open(image_path, 'rb') as f:
        tags = exifread.process_file(f, details=False)

    if 'GPS GPSLatitude' in tags and 'GPS GPSLongitude' in tags:
        lat = convert_to_degrees(tags['GPS GPSLatitude'])
        lon = convert_to_degrees(tags['GPS GPSLongitude'])

        if tags.get('GPS GPSLatitudeRef') and tags['GPS GPSLatitudeRef'].values[0] != 'N':
            lat = 0 - lat
        if tags.get('GPS GPSLongitudeRef') and tags['GPS GPSLongitudeRef'].values[0] != 'E':
            lon = 0 - lon
        return lat, lon
    return None, None

def check_for_spoofing(image_path: str | None, submitted_lat: float, submitted_lon: float, max_distance_meters=500.0) -> bool:
    if not image_path or not os.path.exists(image_path):
        return False
    exif_lat, exif_lon = extract_gps_from_exif(image_path)
    if exif_lat is None or exif_lon is None:
        return False  # No EXIF data to verify against
    
    distance = haversine_distance(submitted_lat, submitted_lon, exif_lat, exif_lon)
    return distance > max_distance_meters
