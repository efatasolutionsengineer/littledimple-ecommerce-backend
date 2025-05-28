const express = require('express');
const router = express.Router();
const blogPostController = require('../controllers/blogPostController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', blogPostController.getAll);
router.post('/', blogPostController.create);
router.put('/:id', blogPostController.update);
router.delete('/:id', blogPostController.delete);

router.post('/:postId/tags', authMiddleware, blogPostController.assignTagsToPost);
router.get('/:postId/tags', blogPostController.getTagsByPost);
router.delete('/:postId/tags', authMiddleware, blogPostController.removeTagsFromBlogPost);

router.post('/:postId/comments', authMiddleware, blogPostController.addComment);
router.get('/:postId/comments', blogPostController.getComments);
router.delete('/comments/:commentId', authMiddleware, blogPostController.deleteComment);

router.get('/stats/category', authMiddleware, blogPostController.getStatsByCategory);
router.get('/stats/author', authMiddleware, blogPostController.getStatsByAuthor);

router.get('/statistics/category', authMiddleware, blogPostController.getArticleCountByCategory);
router.get('/statistics/author', authMiddleware, blogPostController.getArticleCountByAuthor);

router.get('/status/:status', authMiddleware, blogPostController.getBlogPostsByStatus);

module.exports = router;
