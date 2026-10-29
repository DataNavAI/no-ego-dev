import {mountChat} from './chat-ui.js';
import {marked} from '/vendor/marked.js';
import DOMPurify from '/vendor/dompurify.js';
mountChat({marked,DOMPurify});
