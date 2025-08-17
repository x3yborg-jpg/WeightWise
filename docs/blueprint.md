# **App Name**: WeightWise Dashboard

## Core Features:

- Weight Display: Display the real-time weight in grams or kilograms from Firebase Realtime Database.
- Load Level Indicator: Show the load level as a percentage using an animated gauge.
- Real-time Data Fetching: Fetch the latest 'weight' and 'level' values live from the '/loadcell' node in Firebase Realtime Database.
- Status Indication: Visually indicate load status with color-coded thresholds (green <75%, yellow 75-90%, red >90%).
- Timestamp Display: Show the timestamp of the latest data update.

## Style Guidelines:

- Primary color: Deep sky blue (#33A3DC) to suggest the clear precision of technology, but still bright and positive.
- Background color: Light grayish-blue (#E0EBF5). It provides a subtle contrast and a clean backdrop for data presentation.
- Accent color: Seafoam green (#73E2A8), to provide status information at a glance.
- Font: 'Inter', a sans-serif font known for its clarity and modern appearance; ideal for a dashboard interface requiring high readability. 
- Use a responsive, grid-based layout to adapt seamlessly to different screen sizes, ensuring a consistent experience across desktop and mobile devices.
- Incorporate smooth transitions and animations for data updates to enhance visual appeal and user experience (e.g., animated number transitions, progress bar fills).