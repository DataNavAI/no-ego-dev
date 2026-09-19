# Expo/EAS Android release evidence

## Safe variable inventory

Capture only project owner/slug/ID, variable name, environment, visibility/type, update time, build profile, source consumer, native/runtime consumer, and verification result. Never retrieve values.

## Release identity matrix

The source commit, package, `versionName`, `versionCode`, EAS build ID, AAB digest/manifest, installed build, QA receipt, Play track, and Play processed release must agree. Upload acceptance alone is not closure.

## QA boundary

The implementing agent installs and exercises the exact candidate on an emulator, including system back. Physical-device-only capabilities remain explicitly blocked rather than mocked. Analytics evidence contains controlled event fields, not personal data, free text, tokens, or secrets.
