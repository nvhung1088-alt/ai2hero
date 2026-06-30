import { createDubTaskAction } from './app/lib/db/hero-dub-actions';
createDubTaskAction({ teamId: 5, userId: 1, sourceUrl: 'C:\\test\\1.mp4', taskTitle: '1.mp4' }).then(console.log).catch(console.error);
