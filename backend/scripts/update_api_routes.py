import os
import re

api_path = os.path.join("backend", "app", "api", "routes", "api.py")
with open(api_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add logging import and logger definition
if "import logging" not in content:
    content = "import logging\n" + content

if "logger = logging.getLogger(__name__)" not in content:
    content = content.replace("router = APIRouter()", "logger = logging.getLogger(__name__)\n\nrouter = APIRouter()")

# 2. Add /fhir/clinical-bundle alias
if '@router.post("/fhir/clinical-bundle")' not in content:
    content = content.replace(
        '@router.post("/fhir/generate-bundle")',
        '@router.post("/fhir/generate-bundle")\n@router.post("/fhir/clinical-bundle")'
    )

# 3. Add helper _get_bundle_record
helper_code = '''
def _get_bundle_record(db: Session, bundle_id: str) -> Optional[FhirBundle]:
    """Helper to retrieve a FhirBundle by its string bundle_id or numeric primary key."""
    if str(bundle_id).isdigit():
        return db.query(FhirBundle).filter(
            (FhirBundle.bundle_id == bundle_id) | (FhirBundle.id == int(bundle_id))
        ).first()
    return db.query(FhirBundle).filter(FhirBundle.bundle_id == bundle_id).first()
'''

if "def _get_bundle_record" not in content:
    # Insert right before /fhir/history
    content = content.replace(
        "# FHIR Medical Reports Integration & History Endpoints",
        helper_code + "\n# FHIR Medical Reports Integration & History Endpoints"
    )

# 4. Replace manual filter in get_fhir_bundle, delete_fhir_bundle, update_bundle_verification_status
old_lookup = """    record = db.query(FhirBundle).filter(
        (FhirBundle.bundle_id == bundle_id) |
        (FhirBundle.id == int(bundle_id) if bundle_id.isdigit() else False)
    ).first()"""

new_lookup = "    record = _get_bundle_record(db, bundle_id)"

content = content.replace(old_lookup, new_lookup)
content = content.replace(old_lookup.replace("\n", "\r\n"), new_lookup)

# 5. Replace .dict() with .model_dump() on Pydantic v2 responses where applicable
content = content.replace("return explanation.dict()", "return explanation.model_dump() if hasattr(explanation, 'model_dump') else explanation.dict()")
content = content.replace("return context.dict()", "return context.model_dump() if hasattr(context, 'model_dump') else context.dict()")
content = content.replace("return [r.dict() for r in records]", "return [r.model_dump() if hasattr(r, 'model_dump') else r.dict() for r in records]")
content = content.replace("return res.dict()", "return res.model_dump() if hasattr(res, 'model_dump') else res.dict()")
content = content.replace("return report.dict()", "return report.model_dump() if hasattr(report, 'model_dump') else report.dict()")

with open(api_path, "w", encoding="utf-8") as f:
    f.write(content)

print("api.py refined successfully!")
