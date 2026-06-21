# TailorVoice Design System

## 1. Brand Identity & Vibe
- **Name:** TailorVoice
- **Category:** Premium Mobile PWA Utility App
- **Target Audience:** Professional fashion designers, luxury bespoke tailors.
- **Vibe:** "Minimalist Luxury" & "Editorial Utility". The app should feel less like a traditional tech dashboard and more like a high-end digital fashion lookbook. It must be clean, airy, highly legible, and premium.

## 2. Color Palette
The color system avoids harsh pure whites and pure blacks to reduce eye strain, opting for elegant, muted tones.

### Base Colors
- **Background (Primary):** `#FDFDFD` (Alabaster / Off-White) - Used for the main app background.
- **Background (Secondary):** `#F8F9FA` (Soft Grey) - Used for input field backgrounds and subtle card separations.
- **Text (Primary):** `#111827` (Deep Midnight/Almost Black) - Used for headers and primary data.
- **Text (Secondary):** `#6B7280` (Cool Grey) - Used for labels, hints, and secondary text.

### Brand & Accents
- **Primary Accent:** `#0F172A` (Rich Navy Blue) - Used for primary buttons and active states.
- **Highlight/Luxury Accent:** `#D4AF37` (Muted Gold) - Used sparingly for logos, premium icons, or special alerts.

### Contextual Colors (Extremely Subtle Tints)
- **Female Context Background:** `#FFF1F2` (Faint Blush Pink)
- **Male Context Background:** `#EFF6FF` (Faint Slate Blue)
- **Success:** `#ECFDF5` (Mint Green background) with `#059669` (Dark Green text).
- **Error/Alert:** `#FEF2F2` (Soft Red background) with `#DC2626` (Dark Red text).

## 3. Typography
A dual-font system is used to balance elegance with utility.

- **Headers & Display:** `Playfair Display` or `Merriweather` (Serif). Used *only* for the Shop Name, Client Names, and major page titles to give a Vogue-magazine editorial feel.
- **UI & Data:** `Inter` or `Outfit` (Sans-Serif). Used for all measurement numbers, button text, labels, and inputs. It must be geometric, clean, and highly legible.
- **Tracking:** Use wide tracking (letter-spacing) on tiny uppercase labels (e.g., `MEASUREMENTS`) for a sophisticated look.

## 4. Spacing, Layout & Shapes
Since this is a Mobile PWA used by tailors holding measuring tapes, ergonomics are critical.

- **Border Radius:** `24px` to `32px` for large cards and modals. Soft, friendly, premium curves.
- **Tap Targets:** Minimum `48px` height for all interactive elements. Buttons should be large and full-width where possible.
- **Padding/Air:** Generous padding. Elements should never feel cramped. Use 24px margins on the left and right edges of the screen.
- **Shadows:** Use "Soft Elevation". Shadows should be large, very blurred, and low opacity (e.g., `box-shadow: 0 20px 40px rgba(0,0,0,0.04)`). Avoid harsh, dark drop shadows.

## 5. Core Components

### The Navigation
- **Bottom Nav Bar:** A floating, pill-shaped glassmorphism bar at the bottom of the screen.
- **Floating Action Button (FAB):** A prominent, circular or wide-pill button anchored to the bottom. For the voice recorder, it should have a soft, pulsing shadow to indicate "listening" state.

### Cards & Modals
- **Measurement Cards:** Minimalist rectangular cards. No heavy borders. Just a soft background color or a 1px ultra-light grey border (`#F3F4F6`). 
- **Bottom Sheets:** All complex actions (Saving, Editing) should slide up from the bottom of the screen as a modal with a rounded top edge and a small grab-handle pill at the top center.

### Inputs
- **Text Fields:** Borderless inputs sitting on a `#F8F9FA` background with a subtle bottom border that turns Navy Blue when focused.

## 6. Key Screens to Generate
1. **Home/Dashboard:** "Good Morning" greeting (Serif), "Upcoming Deadlines" horizontal scrolling cards, and a big floating "+ NEW JOB" button.
2. **Context Setup Screen:** Large, elegant toggle cards for Male/Female selection, and a clean grid for Garment type selection.
3. **Smart Recorder:** A vertical list of minimalist measurement cards (Shoulder, Chest, etc.) on a faint blush-pink background, with a glowing microphone button floating at the bottom.
4. **Client Details:** A profile view showing 3 square fabric texture photos at the top, followed by a clean, 2-column grid of measurement data, and a "Share to WhatsApp" button.
