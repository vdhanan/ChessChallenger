<template>
  <div class="container">
    <h1>Challenger Queue</h1>
    <div v-if="queue.length > 0">
      <b-button class="mb-1" variant="outline-success" @click="removeFromFront" :href="'https://www.chess.com/live?#ch=' + queue[0][1]">Play Next Challenger</b-button>
      <b-button class="mb-1" variant="outline-danger" @click="removeFromFront">Remove Next Challenger</b-button>
    </div>
    <b-list-group>
      <div v-for="(challenger, position) in queue" :key=position>
        <b-list-group-item v-bind:href="'https://www.chess.com/live?#ch=' + challenger[1]" target="_blank">{{position+1}}. {{challenger[0]}}</b-list-group-item>
      </div>
    </b-list-group>
    <div>
      <b-form-checkbox v-model="acceptingChallenges" @change="updateActive" switch>
        <b> Accepting Challenges: {{ acceptingChallenges }}</b>
      </b-form-checkbox>
    </div>
    <div>
      <b-button v-b-modal.modal-clear>Clear Queue</b-button>

      <b-modal id="modal-clear" title="Clear Challenger Queue" @ok="clearQueue">
        <p class="my-4">Click OK to clear all challenges from the queue. Note that this action cannot be reversed.</p>
      </b-modal>
    </div>
  </div>
</template>

<script>
const ROOT_URL = 'http://127.0.0.1:3000/'
const twitch = window.Twitch.ext

let channelID = ''
let token = ''

export default {
  name: 'LiveConfig',
  data() {
    return {
      queue: [],
      acceptingChallenges: false,
      isListening: false
    }
  },
  methods: {
    pullChannelQueue(){
      fetch(`${ROOT_URL}queue?channel_id=${channelID}`, {
        method: 'GET',
        headers: new Headers({'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`})
      }).then(data => data.json()).then(result =>{
        this.queue = result.Items[0].ChallengeQueue;
        this.acceptingChallenges = result.Items[0].IsActive
      })
    },
    updateActive(){
      let activator = twitch.viewer
      if (activator.role != "broadcaster") {
        return
      }
      fetch(`${ROOT_URL}queue`, {
        method: 'PUT',
        headers: new Headers({'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}),
        body: JSON.stringify({
          updateType: 'activate',
          isActive: this.acceptingChallenges,
          channelId: `${channelID}`
        })
      })
      .then(result => result.json())
      .catch(e => console.log(e))
    },
    clearQueue(){
      if (twitch.viewer.role != "broadcaster") {
        return
      }
      fetch(`${ROOT_URL}queue`, {
        method: 'PUT',
        headers: new Headers({'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}),
        body: JSON.stringify({
          updateType: 'clear',
          channelId: `${channelID}`
        })
      })
      .then(result => result.json())
      .catch(e => console.log(e))
    },
    removeFromFront(){
      if (twitch.viewer.role != "broadcaster") {
        return
      }
      fetch(`${ROOT_URL}queue`, {
        method: 'PUT',
        headers: new Headers({'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}),
        body: JSON.stringify({
          updateType: 'pop',
          channelId: `${channelID}`
        })
      })
      .then(result => result.json())
    },
    listen() {
      if (!this.isListening) {
        this.isListening = true;
        twitch.listen('broadcast', (target, contentType, message) => {
          message = JSON.parse(message);
          this.onPubSub(message);
        })
      }
    },
    onPubSub(message) {
      if (message.isActive) {
        this.acceptingChallenges = message.isActive
      }
      if (message.updatedQueue) {
        this.queue = message.updatedQueue
      }
    },
    unlisten() {
      if (this.isListening) {
        this.isListening = false;
        twitch.unlisten('broadcast');
      }
    }
  },
  async beforeMount() {
    await twitch.onAuthorized((auth) => {
      channelID = auth.channelId
      token = auth.token
      this.pullChannelQueue()
      this.listen()
    })
  },
  beforeDestroy() {
    this.unlisten()
  }
}
</script>
