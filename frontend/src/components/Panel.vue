<template>
  <div class="container">
    <h1 class="title">Challenger Queue</h1>
    <b-list-group>
      <div v-for="(challenger, position) in queue" :key=position>
        <b-list-group-item style="background: #6441A4;">
          <div class="challenge-list-item">
            {{position+1}}. {{challenger[0]}}
          </div>
        </b-list-group-item>
      </div>
    </b-list-group>
    <div v-show="acceptingChallenges">
      <b-form-input v-model="chessDisplayName" placeholder="Your chess.com username" style="border: #6441A4;"></b-form-input>
      <b-button @click="submitChallenge">Challenge Streamer</b-button>
    </div>
  </div>
</template>

<script>
const ROOT_URL = 'https://z6hyajs681.execute-api.us-west-2.amazonaws.com/prod/'
const twitch = window.Twitch.ext

let channelID = ''
let token = ''

export default {
  name: 'Panel',
  data() {
    return {
      queue: [],
      chessDisplayName: '',
      acceptingChallenges: false
    }
  },
  methods: {
    pullChannelQueue(){
      fetch(`${ROOT_URL}queue?channel_id=${channelID}`, {
        method: 'GET',
        headers: new Headers({'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`})
      }).then(data => data.json()).then(result => {
        console.log(result)
        this.queue = result.Items[0].ChallengeQueue;
        this.acceptingChallenges = result.Items[0].IsActive
      })
    },
    submitChallenge(){
      console.log(this.acceptingChallenges, "accepting challenges")
      if (!this.acceptingChallenges) {
        this.$bvToast.toast("This streamer is not accepting challenges at the moment.", {
          title: "Error",
          variant: "warning",
          solid: true
        })
        return
      }
      let challenger = twitch.viewer
      console.log(twitch.features.isSubscriptionStatusAvailable)
      if (challenger.id == null || !challenger.subscriptionStatus) {
        console.log(challenger.subscriptionStatus)
        this.$bvToast.toast("You must be a subscriber and share your ID to join the queue.", {
          title: "Error",
          variant: "warning",
          solid: true
        })
        return
      }
      for (let i = 0; i < this.queue.length; i++){
        if (this.queue[i][2] == challenger.id){
          this.$bvToast.toast("You have already been added to the queue.", {
            title: "Error",
            variant: "warning",
            solid: true
          })
        this.chessDisplayName = ''
        return
        }
      }
      fetch(`${ROOT_URL}queue`, {
        method: 'PUT',
        headers: new Headers({'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}),
        body: JSON.stringify({
          updateType: 'push',
          channelId: `${channelID}`,
          twitchId: challenger.id,
          chessDisplayName: this.chessDisplayName
        })
      })
      .then(res => {
        this.chessDisplayName = '';
        if (res.ok) {
          this.$bvToast.toast("You're in the queue!", {
            title: "Success",
            variant: "success",
            solid: true
          })
        }
        else {
          this.$bvToast.toast("You could not be added to the queue.", {
            title: "Error",
            variant: "danger",
            solid: true
          })
        }
      })
      .catch(e => console.log(e))
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
      if ('isActive' in message) {
        this.acceptingChallenges = message.isActive
      }
      if ('updatedQueue' in message) {
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

<style>

* {
    margin: 0 !important;
}

.container {
  background-color: #201c2b;
  min-height: 300px;
}

.title {
  color: #e5e3e8;
}

.challenge-list-item {
  color: #e2dbf0;
}

</style>
