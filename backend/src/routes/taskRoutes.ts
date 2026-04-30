import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { requireProjectMember, requireProjectAdmin } from '../middleware/requireAuth';

const router = Router({ mergeParams: true });

router.use(requireProjectMember);

router.get('/', TaskController.list);
router.post('/', TaskController.create);

router.patch('/:taskId', TaskController.update);
router.delete('/:taskId', requireProjectAdmin, TaskController.delete);

router.post('/:taskId/comments', TaskController.addComment);
router.get('/:taskId/comments', TaskController.listComments);

export default router;
