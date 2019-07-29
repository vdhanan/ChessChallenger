# ChessChallenger

A Twitch extension that lets subscribers challenge a Twitch streamer to a game of chess. After installation, a streamer can activate the challenge queue to accept game requests from subscribers. Subscribers can join the queue by simply entering their chess.com username. Authentication is handled using the Twitch API and extension helper.

The extension frontend was built using Vue.js. The serverless backend was built using Node.js and Express, on top of AWS Lambda and Amazon API Gateway. Data is stored in an Amazon DynamoDB table.

Here is what the streamer sees in the dashboard when he or she has configured the extension:
![streamer view](https://github.com/vdhanan/ChessChallenger/blob/master/images/broadcaster_view.png "Streamer's View")

As long as the streamer is accepting challenges, any subscriber can join the challenge queue. Streamers can stop accepting challenges, play the next challenger in line, skip the next challenger in line, or clear the queue entirely.

Here is what viewers see on the streamer's channel:
![viewer view](https://github.com/vdhanan/ChessChallenger/blob/master/images/viewer_view.png "Viewers' View")

Whenever an update is made to the queue (e.g. a subscriber joins the queue), the extension backend service uses the Twitch PubSub system to send the update to the streamer and to all viewers. This allows updates to be seen by all viewers in real time.

This extension is currently in beta, pending approval from Twitch. Upon approval, a link to install the extension will be provided here. Thanks for checking this out, and stay tuned!
