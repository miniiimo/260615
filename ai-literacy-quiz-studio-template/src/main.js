import {VRQuizApp} from './App.js?v=20260608-homefree1';

const root = document.querySelector('#app');
const config = window.VR_QUIZ_CONFIG || {};

const app = new VRQuizApp(root, config);
app.start();
