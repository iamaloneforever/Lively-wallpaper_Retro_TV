import './style.css';
import { App } from './core/App';
const app = new App(document.querySelector<HTMLElement>('#app')!);
if (import.meta.hot) import.meta.hot.dispose(() => app.dispose());
