import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import Demo from './Demo.vue'
import Surveys from './surveys.vue'
import video from './videos.vue'

const data = {
  theme: '1',
  questions: [
    {
      text: '111',
      options: [
        {
          text: '1',
          value: 1,
        },
        {
          text: '1',
          value: 2,
        },
        {
          text: '1',
          value: 3,
        },
      ],
    },
    {
      text: '222',
      options: [
        {
          text: '2',
          value: 1,
        },
        {
          text: '2',
          value: 2,
        },
        {
          text: '2',
          value: 3,
        },
      ],
    },
    {
      text: '333',
      options: [
        {
          text: '3',
          value: 1,
        },
        {
          text: '3',
          value: 2,
        },
        {
          text: '3',
          value: 3,
        },
      ],
    },
  ],
  ranges: [
    {
      min: 10,
      label: '不及格',
    },
    {
      min: 60,
      label: '及格',
    },
    {
      min: 80,
      label: '中等',
    },
    {
      min: 90,
      label: '良好',
    },
    {
      min: 100,
      label: '优秀',
    },
  ],
}

fetch('vite/commons/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'enm',
    password: '12345123',
    role: 'admin',
  }),
})
  .then(res => res.json())
  .then(res => {
    window.token = localStorage.token = res.data.token

    createApp(App).mount('#app')

    // fetch('vite/api/v1/surveys', {
    //   headers: {
    //     Authorization: `Bearer ${window.token}`,
    //   },
    // })

    // fetch('vite/api/v1/surveys', {
    //   headers: {
    //     Authorization: `Bearer ${window.token}`,
    //     'Content-Type': 'application/json',
    //   },
    //   method: 'POST',
    //   body: JSON.stringify(data),
    // })
  })
