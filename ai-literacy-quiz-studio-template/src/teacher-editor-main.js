import {TeacherEditor} from './components/TeacherEditor.js?v=20260510-inplacegrid1';

const root = document.querySelector('#teacher-editor');
const editor = new TeacherEditor(root, window.VR_QUIZ_CONFIG || {});

editor.start();

