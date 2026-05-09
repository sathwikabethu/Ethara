import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { requireAuth, requireProjectMember, requireProjectAdmin } from '../middleware/requireAuth';
import taskRoutes from './taskRoutes';

const router = Router();

router.use(requireAuth);

router.get('/', ProjectController.list);
router.post('/', ProjectController.create);

router.get('/:id', requireProjectMember, ProjectController.getDetails);
router.patch('/:id', requireProjectAdmin, ProjectController.update);
router.delete('/:id', requireProjectAdmin, ProjectController.delete);

router.post('/:id/members', requireProjectAdmin, ProjectController.addMember);
router.delete('/:id/members/:userId', requireProjectAdmin, ProjectController.removeMember);

router.get('/:id/activity', requireProjectMember, ProjectController.listActivity);

router.use('/:id/tasks', taskRoutes);

export default router;
