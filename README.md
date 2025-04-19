
# 🚑 AmbuFree: Smart Ambulance Alert System

In emergency situations, every second counts. Traffic congestion often delays ambulance response times, resulting in critical losses. **AmbuFree** is a web and mobile-based solution designed to streamline ambulance movement by **alerting nearby vehicles to clear the path**, reducing delays and enabling faster access to patients.

## 🔧 How It Works

The system uses GPS and mapping technologies to determine the **shortest and fastest route** from the ambulance's current location to the patient. Once this route is calculated, the app identifies all **registered users (drivers)** within a **5 km radius** along the route and sends them an **automated SMS alert**, asking them to give way to the ambulance.

## 🌟 Key Features

- 📍 **Real-time Route Calculation**  
  Utilizes Google Maps API to compute the shortest path from ambulance to patient.

- 📡 **Dynamic Radius Detection**  
  Identifies all drivers within a **5 km range** along the ambulance's live route.

- ✉️ **Automated SMS Alerts**  
  Uses SMS gateways like **Twilio** or **Fast2SMS** to notify drivers instantly.

- 🖥️ **Web Dashboard**  
  For hospital staff or ambulance operators to **trigger alerts with a single click**.

## 💡 Tech Stack

- **Frontend**: React / React Native  
- **Backend**: Node.js / Express.js  
- **Database**: PostgreSQL  
- **Mapping APIs**: Google Maps API  
- **SMS Gateway**: Twilio / Fast2SMS  
- **Hosting**: Render / Vercel / Netlify (based on deployment)

## 🚀 Future Scope

- Integration with **smart traffic systems** and **vehicle-to-infrastructure (V2I)** communication  
- Real-time **visual tracking** of ambulance route for other users  
- Automated **traffic signal override** to prioritize ambulance routes  
- Enhanced **AI-based congestion detection** for even faster rerouting  

## 📸 Demo

[Add screenshots or a video link here if available]
