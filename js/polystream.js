var polystream = (function () {
	var instance;
	var gl, sp;
	var canvas;
	var globs = {};
	var mvMatrix = mat4.create();
	var pMatrix = mat4.create();

	var lastTime = 0;

	function polystream(id, options) {
		canvas = document.getElementById(id);
		GL.initGL(canvas, [0.9, 0.9, 0.9, 1.0], options.vs, options.fs)
		.then(renderScene, function(error){ throw error; })
		.catch(function(e){ console.error(e); })
	}

	function renderScene(glTools){
		gl = glTools.gl;
		sp = glTools.shaderProgram;
		linkShaders();
		
		createGlobs().then(function(_globs){
			globs = _globs;
			registerAnimations();
			tick();
		}, function(error){throw error; });
	}

	function linkShaders(){
		GL.linkShaders(sp, {
			attributes: ['aVertexPosition', 'aVertexColor'],
			uniforms: ['uPMatrix', 'uMVMatrix']
		});
	}

	function setMatrixUniforms(){
		gl.uniformMatrix4fv(sp.uniforms.uPMatrix, false, pMatrix);
		gl.uniformMatrix4fv(sp.uniforms.uMVMatrix, false, mvMatrix);
	}

	function createGlobs(){
		var grid = globFactory.simpleGrid({
			name: 'grid',
			pos: [-2,-2,-9],
			drawOptions: { gl: gl, mode: gl.LINES }
		});

		return new Promise(function(resolve, reject){
			globFactory.createGlobs({
				triangle: { name: 'triangle',
					pos: [20, -20,-70],
					url: 'glob/triangle.json',
					drawOptions: {gl: gl, mode: gl.LINE_LOOP }
				},
				teapot: { name: 'teapot',
					pos: [0,0,-60],
					url: 'glob/teapot.json',
					drawOptions: { gl: gl, mode: gl.LINE_STRIP },
					lazy: {arrayKey: 'verts', throttle: 10, bufferGrouping: 3 }
				}
			}).then(function(result){
				subscribeToStreams(result.streams);
				result.globs.grid = grid;
				resolve(result.globs);
			}, function(error){ reject(error); });
		});
	}

	function subscribeToStreams(streams){
		if (Object.keys(streams).length === 0) return;
		streams.teapot.subscribe(function(value){
			globs.teapot.push('verts', value, gl);
		});
	}

	function registerAnimations(){
		globs.teapot.registerAnimation('rotate',
			function(glob, mvMatrix){
				mat4.rotate(mvMatrix, GL.degToRad(glob.rotation), [0, 1, 0]);
			},
			function(glob, t){ glob.rotation = ((10 * t) / 1000.0) % 360; });
		globs.triangle.registerAnimation('rotate',
			function(glob, mvMatrix){
				mat4.rotate(mvMatrix, GL.degToRad(glob.rotation), [0, 1, 0]);
			},
			function(glob, t){ glob.rotation = ((90 * t) / 1000.0) % 360; });
	}

	function tick(){
		requestAnimationFrame(tick);
		drawScene();
		animate();
	}

	function drawScene(){
		GL.resize();
		GL.drawGL(pMatrix);
		for(var i in globs){
			if(globs[i] !== undefined) mvMatrix = globs[i].draw(gl, mvMatrix, sp.attributes.aVertexPosition, sp.attributes.aVertexColor, setMatrixUniforms);
		}
	}

	function animate(){
		var timeNow = new Date().getTime();
		if (lastTime != 0) {
			var elapsed = timeNow - lastTime;
			for(var i in globs){
				for(var j in globs[i].timeUpdates){
					globs[i].timeUpdates[j](globs[i], timeNow);
				}
			}
		}
		lastTime = timeNow;
	}

	function printGlobs(){ for(var i in globs) globs[i].log(); }

	return {
		start: function (id, options) {
			if (!instance) { instance = new polystream(id, options); }
			return instance;
		},
		printGlobs: printGlobs
	}
})();

