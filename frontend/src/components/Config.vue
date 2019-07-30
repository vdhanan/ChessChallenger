<template>
  <div class="container">
    <h1> Quick Setup </h1>
    <div v-show="!setupComplete">
      <b-button @click="setupQueue">Create Challenge Queue</b-button>
    </div>
    <div v-show="setupComplete">
      <p> "You're good to go!" </p>
    </div>
  </div>
</template>

<script>
const ROOT_URL = 'https://z6hyajs681.execute-api.us-west-2.amazonaws.com/prod/'
const twitch = window.Twitch.ext

let channelID = ''
let token = ''

export default {
  name: 'Config',
  data() {
    return {
      setupComplete: false
    }
  },
  methods: {
    setupQueue(){
      fetch(`${ROOT_URL}queue`, {
        method: 'POST',
        headers: new Headers({'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}),
        body: JSON.stringify({
          channelId: `${channelID}`
        })
      })
      .then(res => {
        if (res.ok) {
          this.setupComplete = true
        }
        else {
          console.log("Something is wrong...")
        }
      })
      .catch(e => console.log(e))
    }
  },

  async beforeMount() {
    await twitch.onAuthorized((auth) => {
      channelID = auth.channelId
      token = auth.token
    })
  }
}
</script>
