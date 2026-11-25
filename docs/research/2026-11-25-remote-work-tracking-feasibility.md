# Remote Work Tracking: Feasibility (25 Nov 2026)

One researcher, 14 searches, snippets only. No legal conclusions. UNVERIFIED
means check the official page before relying on it.

## UAE law and regulators (what to check)

- PDPL (Federal Decree-Law 45 of 2021): secondary sources say personal data
  expressly includes geographical location, so employee location is in scope.
  Consent is the default basis, withdrawable; one law-firm summary says onshore
  monitoring is acceptable with notice plus consent (UNVERIFIED, secondary).
- Sensitive data: summaries list biometrics, health and similar; location is
  not listed (verify the full wording). Biometrics matter for face-verification
  check-ins. A data protection officer may be needed for systematic processing
  of sensitive data.
- Executive regulations status and any UAE Data Office guidance on employee
  monitoring: not found.
- DIFC and ADGM: no standalone surveillance law; monitoring needs full notice,
  proportionality, and an impact assessment for high-risk monitoring; less
  intrusive options preferred (law-firm commentary).
- Labour law: remote work is a recognised model via the Executive Regulations;
  MOHRE remote-work guidelines say same rights and obligations as on-site staff
  and hours are specified in the contract (secondary; guidelines not read).
  MOHRE rules on tracking hours at home: not found.

## Technical constraints

- Google Play: background location needs a permission declaration, demo video
  and prominent in-app disclosure, and must be core to the app.
- Apple: developer-forum reports of App Review rejections for background
  location "for the sole purpose of tracking employees" (UNVERIFIED against
  Apple's current text). Treat as a review risk.
- Android: geofencing is the lower-battery option; continuous tracking needs a
  foreground service with a location type on Android 14 and later.
- Desktop: macOS needs Accessibility for active-window and idle detection;
  Screen Recording only for screenshots or some window titles (vendor guidance).
  Windows details and browser-extension-only options: not found.

## Rivals and backlash

- Hubstaff (vendor claims): tracking only when the timer is on, no keystroke
  logging, screenshot blur or off per user, employees see their own data.
- Time Doctor: reported screen video and webcam photos every 10 minutes (NPR);
  EFF compares such "bossware" to stalkerware; a 2026 report says some
  monitoring platforms shared data with third parties (headline only).
- Regulator actions against employers (global, from snippets): H&M (Hamburg,
  EUR 35.3 million), Amazon France Logistique (CNIL, EUR 32 million,
  "excessively intrusive" monitoring and long retention), an Italian fine over
  GPS tracking of remote staff, CNIL fines over remote-worker monitoring.
- HR suites (Zoho People, Keka, Bayzat, ZenHR): GPS or geofenced clock-in and
  location check-in; Bayzat also face verification. None of them was found
  offering screenshots or screen-time (not confirmed absent). Keka's own
  article calls GPS more invasive than biometrics and stresses consent.

## Design patterns (supported where noted)

Track only while clocked in; no keystroke logging; screenshots off or blurred
and optional; the employee sees their own data (Hubstaff). Location checked at
clock-in is lower-drain and less intrusive (Android guidance and the DIFC and
ADGM preference for less intrusive options). An impact assessment is expected
by DIFC, ADGM and the CNIL; long retention was penalised in the Amazon case.
Pause button, category-level reports: design suggestions, not sourced.

## Overtime and WPS

Standard 8 hours a day or 48 a week; overtime at least basic wage plus 25%, or
at least 50% between 22:00 and 04:00; cap of 2 extra hours a day (secondary
press and u.ae). Remote hours are set by the contract. Screen time and location
are not required by anything found, so activity data should not drive pay
without human review. Whether remote hours must appear in WPS files: not found.
