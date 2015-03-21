var Todo = require('./models/todo');

module.exports = function(app) {
	// READ all Todos
	app.get('/api/todos', function(req, res) {
		Todo.find(function(err, todos) {
			if(err) res.send(err);

			res.json(todos);
		});
	});

	// READ a todo
	app.get('/api/todos/:todo_id', function(req, res) {
		Todo.findById(req.params.todo_id, function(err, todo) {
			if(err) res.send(err);

			res.json(todo);
		});
	});

	// CREATE Todo
	app.post('/api/todos', function(req, res) {
		Todo.create({
			text: req.body.text,
			done: false
		}, function(err, todo) {
			if(err) res.send(err);

			Todo.find(function(err, todos) {
				if(err) res.send(err);

				res.json(todos);
			});		
		});
	});

	// DELETE Todo
	app.delete('/api/todos/:todo_id', function(req, res) {
		Todo.remove({
			_id: req.params.todo_id
		}, function(err, todo) {
			if(err)	res.send(err);

			Todo.find(function(err, todos) {
				if(err) res.send(err);

				res.json(todos);
			});
		});
	});

	// UPDATE Todo
	app.put('/api/todos/:todo_id', function(req, res) {
		Todo.findById(req.params.todo_id, function(err, todo) {
			if(err) res.send(err);

			todo.text = req.body.text;
			todo.save(function(err, todo, cnt) {
				if(err) res.send(err);

				Todo.find(function(err, todos) {
					if(err) res.send(err);

					res.json(todos);
				});
			});
		});

	});

	app.get('*', function(req, res) {
		res.sendFile('./public/index.html');
	});
};