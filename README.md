# Ably LHR Arrivals Tracker

This demo app uses live aircraft data for flights due to arrive at London Heathrow. A circle is drawn around Heathrow airspace which you can resize using the appropriate buttons in the menu bar. If a plane enters the circle, the circle flashes and the plane colour turns from blue to red. Click on a plane to see the flight details.

To run it:

1. Copy `sample.env` to `.env` and enter your Ably API key secret.
1. Run `npm install` and then `npm start`
1. Visit `https://localhost:8080` in your browser.
