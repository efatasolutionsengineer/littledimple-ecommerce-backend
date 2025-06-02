const express = require('express');
const router = express.Router();
const blogPostController = require('../controllers/blogPostController');
const authMiddleware = require('../middleware/authMiddleware');
const adminCheck = require('../middleware/adminCheck');




// router.post('/:postId/tags', authMiddleware, blogPostController.assignTagsToPost);
// router.get('/:postId/tags', blogPostController.getTagsByPost);
// router.delete('/:postId/tags', authMiddleware, blogPostController.removeTagsFromBlogPost);

// router.post('/:postId/comments', authMiddleware, blogPostController.addComment);
// router.get('/:postId/comments', blogPostController.getComments);
// router.delete('/comments/:commentId', authMiddleware, blogPostController.deleteComment);
router.get('/lists', blogPostController.getAll);
router.get('/count-by-category', blogPostController.getCountByCategory);
router.post('/request-topic', blogPostController.createRequest);

router.use(authMiddleware);
router.get('/', adminCheck, blogPostController.getAllAdmin);
router.post('/', adminCheck, blogPostController.create);
router.put('/:id', adminCheck, blogPostController.update);
router.delete('/:id', adminCheck, blogPostController.delete);

router.get('/stats/category', adminCheck, blogPostController.getStatsByCategory);
router.get('/stats/author', adminCheck, blogPostController.getStatsByAuthor);

router.get('/statistics/category', adminCheck, blogPostController.getArticleCountByCategory);
router.get('/statistics/author', adminCheck, blogPostController.getArticleCountByAuthor);

router.get('/status/:status', adminCheck, blogPostController.getBlogPostsByStatus);

router.get('/request-topic', adminCheck, blogPostController.getAllRequests);
router.delete('/request-topic/:id', authMiddleware, blogPostController.deleteRequest);

module.exports = router;
