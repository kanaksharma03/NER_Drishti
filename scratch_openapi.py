import yaml

with open('C:/Users/lenovo/OneDrive/Desktop/NERDrishti/NER-FRONTEND/Frontend_NER/lib/api-spec/openapi.yaml', 'r') as f:
    data = yaml.safe_load(f)

# Risk Grid Response
data['paths']['/v1/risk/grid']['get']['responses']['200']['content']['application/json']['schema'] = {
    '$ref': '#/components/schemas/RiskGridResponse'
}
data['components']['schemas']['RiskGridResponse'] = {
    'type': 'object',
    'required': ['type', 'features'],
    'properties': {
        'type': {'type': 'string', 'enum': ['FeatureCollection']},
        'features': {
            'type': 'array',
            'items': {
                'type': 'object',
                'required': ['type', 'id', 'geometry', 'properties'],
                'properties': {
                    'type': {'type': 'string', 'enum': ['Feature']},
                    'id': {'type': 'integer'},
                    'geometry': {
                        'type': 'object',
                        'required': ['type', 'coordinates'],
                        'properties': {
                            'type': {'type': 'string', 'enum': ['Polygon']},
                            'coordinates': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'number'}}}}
                        }
                    },
                    'properties': {
                        'type': 'object',
                        'required': ['elevation', 'slope', 'probability'],
                        'properties': {
                            'elevation': {'type': 'number', 'nullable': True},
                            'slope': {'type': 'number', 'nullable': True},
                            'probability': {'type': 'number'}
                        }
                    }
                }
            }
        }
    }
}
del data['components']['schemas']['RiskCell']

# Risk Detail
data['components']['schemas']['RiskFactor'] = {
    'type': 'object',
    'required': ['feature', 'contribution', 'is_positive_driver'],
    'properties': {
        'feature': {'type': 'string'},
        'contribution': {'type': 'number'},
        'is_positive_driver': {'type': 'boolean'}
    }
}
data['components']['schemas']['RiskDetail'] = {
    'type': 'object',
    'required': ['lat', 'lon', 'risk_probability', 'probability', 'severity_tier', 'severity', 'timestamp', 'top_factors'],
    'properties': {
        'lat': {'type': 'number'},
        'lon': {'type': 'number'},
        'risk_probability': {'type': 'number'},
        'probability': {'type': 'number'},
        'severity_tier': {'type': 'string'},
        'severity': {'type': 'string'},
        'timestamp': {'type': 'string', 'format': 'date-time'},
        'top_factors': {
            'type': 'array',
            'items': {'$ref': '#/components/schemas/RiskFactor'}
        }
    }
}

# ReportInput
data['components']['schemas']['ReportInput'] = {
    'type': 'object',
    'required': ['type', 'description', 'lat', 'lon'],
    'properties': {
        'type': {'type': 'string'},
        'description': {'type': 'string'},
        'lat': {'type': 'number'},
        'lon': {'type': 'number'},
        'photo': {'type': 'string', 'format': 'binary'},
        'region_id': {'type': 'integer'}
    }
}

# ReportSubmission
data['components']['schemas']['ReportSubmission'] = {
    'type': 'object',
    'required': ['status', 'is_spoofed', 'cluster_id'],
    'properties': {
        'status': {'type': 'string'},
        'is_spoofed': {'type': 'boolean'},
        'cluster_id': {'type': 'integer'}
    }
}

# Alert
data['components']['schemas']['Alert'] = {
    'type': 'object',
    'required': ['id', 'audience_tier', 'severity_tier', 'channel', 'message_payload', 'sent_at'],
    'properties': {
        'id': {'type': 'integer'},
        'audience_tier': {'type': 'string'},
        'severity_tier': {'type': 'string'},
        'channel': {'type': 'string'},
        'message_payload': {'type': 'string'},
        'sent_at': {'type': 'string', 'format': 'date-time'}
    }
}

# RoadImpact
data['paths']['/v1/roads-impacted']['get']['responses']['200']['content']['application/json']['schema'] = {
    '$ref': '#/components/schemas/RoadImpactsResponse'
}
data['components']['schemas']['ImpactedSegment'] = {
    'type': 'object',
    'required': ['highway_class', 'name', 'risk_level'],
    'properties': {
        'highway_class': {'type': 'string'},
        'name': {'type': 'string'},
        'risk_level': {'type': 'string'}
    }
}
data['components']['schemas']['RoadImpactsResponse'] = {
    'type': 'object',
    'required': ['status', 'impacted_segments'],
    'properties': {
        'status': {'type': 'string'},
        'impacted_segments': {
            'type': 'array',
            'items': {'$ref': '#/components/schemas/ImpactedSegment'}
        }
    }
}
del data['components']['schemas']['RoadImpact']

# SafeRoute
data['components']['schemas']['SafeRoute'] = {
    'type': 'object',
    'required': ['status', 'is_primary_blocked', 'primary_route', 'alternate_route', 'active_route'],
    'properties': {
        'status': {'type': 'string'},
        'is_primary_blocked': {'type': 'boolean'},
        'primary_route': {
            'type': 'object',
            'properties': {
                'type': {'type': 'string', 'enum': ['Feature']},
                'properties': {
                    'type': 'object',
                    'properties': {
                        'name': {'type': 'string'},
                        'role': {'type': 'string'},
                        'color': {'type': 'string'}
                    }
                },
                'geometry': {
                    'type': 'object',
                    'properties': {
                        'type': {'type': 'string', 'enum': ['LineString']},
                        'coordinates': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'number'}}}
                    }
                }
            }
        },
        'alternate_route': {
            'type': 'object',
            'properties': {
                'type': {'type': 'string', 'enum': ['Feature']},
                'properties': {
                    'type': 'object',
                    'properties': {
                        'name': {'type': 'string'},
                        'role': {'type': 'string'},
                        'color': {'type': 'string'}
                    }
                },
                'geometry': {
                    'type': 'object',
                    'properties': {
                        'type': {'type': 'string', 'enum': ['LineString']},
                        'coordinates': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'number'}}}
                    }
                }
            }
        },
        'active_route': {
            'type': 'array',
            'items': {'type': 'array', 'items': {'type': 'number'}}
        }
    }
}

# Replay
data['components']['schemas']['ReplayFrame'] = {
    'type': 'object',
    'required': ['time', 'risk_modifier', 'description'],
    'properties': {
        'time': {'type': 'string'},
        'risk_modifier': {'type': 'number'},
        'description': {'type': 'string'}
    }
}
data['components']['schemas']['Replay'] = {
    'type': 'object',
    'required': ['event', 'frames'],
    'properties': {
        'event': {'type': 'string'},
        'frames': {
            'type': 'array',
            'items': {'$ref': '#/components/schemas/ReplayFrame'}
        }
    }
}

with open('C:/Users/lenovo/OneDrive/Desktop/NERDrishti/NER-FRONTEND/Frontend_NER/lib/api-spec/openapi.yaml', 'w') as f:
    yaml.dump(data, f, sort_keys=False)

print('Updated openapi.yaml')
