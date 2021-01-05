(function(window,document,undefined){

	var socket = io.connect();

	var nameForm = document.getElementById("nameform");
	var nickNameInput = document.getElementById("nickname");
	var nameFormOverlay = document.querySelector(".overlay");
	nickNameInput.focus(); 
	nameForm.addEventListener("submit", function(event){
		event.preventDefault();
		var nickName = nickNameInput.value.trim();
		if(nickName != ""){
			nickNameInput.value = "";
			nameFormOverlay.style.display = "none";
			socket.emit("ready", {
				nickname: nickName
			});
			findingMatch();
		} else {
			nickNameInput.value = "";
			nickNameInput.focus();
		}
	});

	function findingMatch(){
		window.matchmeOverlay = document.querySelector(".matchme");
		matchmeOverlay.style.display = "block";
		var matchme = document.querySelector(".matchme h3");
		var count = 0;
		window.matchAnimation = setInterval(function(){
			count = (count == 3)? 0: count + 1;
			switch(count){
				case 0:
					matchme.innerHTML = "Buscando partida";
					break;
				case 1:
					matchme.innerHTML = "Buscando partida.";
					break;
				case 2: 
					matchme.innerHTML = "Buscando partida..";
					break;
				case 3:
					matchme.innerHTML = "Buscando partida...";
					break;
			}
		},200);
	};

	socket.on("start game", function(data){

		window.clearInterval(matchAnimation);
		matchmeOverlay.style.display = "none";
		document.getElementById("p1").innerHTML = "<b>Tu:</b> "+data.p1.name+"<b> Color verde</b>";
		document.getElementById("p2").innerHTML = "<b>Enemigo:</b> "+data.p2.name+"<b> Color rojo</b>";
		window.field = new Field();
		socket.p1 = new Snake();
		socket.p2 = new Snake();

		socket.p1.name = data.p1.name;
		socket.p2.name = data.p2.name;

		socket.p1.color = data.p1.color;
		socket.p2.color = data.p2.color;

		socket.p1.body = data.p1.body;
		socket.p2.body = data.p2.body;

		socket.food = new Food();
		socket.food.set = data.foodset
		socket.food.colors = data.foodColors;

		field.draw();
		socket.p1.draw();
		socket.p2.draw();
		socket.food.draw();

		socket.on("paint data", function(data){
			socket.p1.body = data.p1body;
			socket.p2.body = data.p2body;
			socket.food.set = data.foodset;
		});

		var opacity = 1;
		socket.on("hit self", function(data){
			socket.winner = data.winner;
			if(data.snake == 1 ){
				socket.p1.fadeout = true;
			} else if (data.snake == 2){
				socket.p2.fadeout = true;
			}
		});

		countDown(function(){
			socket.emit("go");
			socket.p1.emitControls(socket);
			(function drawFrame(){
				var drawFrames = window.requestAnimationFrame(drawFrame);
				socket.emit("get data");
				field.ctx.clearRect(0,0,field.cw,field.ch);
				field.draw();
				socket.food.draw();
				if(socket.p1.fadeout){
					opacity -= 0.01;
					field.ctx.globalAlpha = opacity;
					if(opacity <=0){
						window.cancelAnimationFrame(drawFrames);
						field.deathScreen(function(){
							var es = document.getElementById("endscreen");
							es.style.display = "block";
							es.innerHTML = socket.winner + " gana!<br><a id='pa' href='/'>Jugar de nuevo</a>";
						});
						return;
					}
				}
				socket.p1.draw();
				field.ctx.globalAlpha = 1;
				if(socket.p2.fadeout){
					opacity -= 0.01;
					field.ctx.globalAlpha = opacity;
					if(opacity <=0){
						window.cancelAnimationFrame(drawFrames);
						field.deathScreen(function(){
							var es = document.getElementById("endscreen");
							es.style.display = "block";
							es.innerHTML = socket.winner + " gana!<br><a id='pa' href='/'>Jugar de nuevo</a>";
						});
						return;
					}
				}
				socket.p2.draw();
				field.ctx.globalAlpha = 1;
			})();
		});

	});

	
	function countDown(callback){
		window.countdown = document.getElementById("countdown");
		countdown.style.display = "block";
		var count = 3;
		(function tick(){
			countdown.innerHTML = count;
			count--;
			if(count>=0){
				setTimeout(tick, 1000);
			} else {
				countdown.innerHTML = "GO! UwU";
				countdown.className = "fade";
				callback();
			}
		})();
	};

	window.Field = (function(){

		function Field(){
			this.screen = Field.screen = document.getElementById("canvas");        
			this.ctx = Field.ctx = Field.screen.getContext("2d");                
			Field.screen.style.background = "#333";                  
			this.cw = Field.cw = parseInt(Field.screen.style.width = "1000px"); 
			this.ch = Field.ch = parseInt(Field.screen.style.height = "700px"); 
		};

		Field.prototype.draw = function(){
			Field.ctx.strokeStyle = "#222";
			for(var x = 20; x<Field.cw; x += 20){
				Field.ctx.beginPath();
				Field.ctx.moveTo(x,0);
				Field.ctx.lineTo(x,Field.ch);
				Field.ctx.stroke();
			}
			for(var x = 20; x<Field.ch; x += 20){
				Field.ctx.beginPath();
				Field.ctx.moveTo(0,x);
				Field.ctx.lineTo(Field.cw,x);
				Field.ctx.stroke();
				Field.ctx.closePath();
			}
		}

		Field.prototype.deathScreen = function(cb){
			Field.ctx.clearRect(0,0,Field.cw,Field.ch);
			Field.ctx.fillStyle = "#1FCA23";
			Field.ctx.fillRect(0,0,Field.cw,Field.ch);
			cb();
		}

		return Field;

	})();

	window.Snake = (function(){

		function Snake(){
			this.color = [];
			this.body = [];
			this.fadeout = false;
			this.name = "";
		}
		Snake.prototype.draw = function(){
			var that = this;
			for(var i = 0; i<this.body.length; i++){
				(function colorSnake(colorNum,callback){
					if(colorNum === 0){
						Field.ctx.fillStyle = that.color[0];
						callback();
					} else if (colorNum === 1){
						Field.ctx.fillStyle = that.color[1];
						callback();
					} else if (colorNum === 2){
						Field.ctx.fillStyle = that.color[2];
						callback();
					} else {
						while(colorNum>2){
							colorNum-=2;
						}
						colorSnake(colorNum,callback);
					}
				})(i,function(){
					Field.ctx.fillRect(
						that.body[i].xpos+1,
						that.body[i].ypos+1,
						18,
						18
					);
				});
			}
		};

		Snake.prototype.emitControls = function(socket){
			window.addEventListener("keypress", function(e){
				var k = e.keyCode;
				if(k === 119 || k === 87){
					var direction = 1;
				} else if (k === 100 || k === 68){
					var direction = 2;
				} else if (k ===115 || k === 83){
					var direction = 3;
				} else if (k===97 ||k===65){
					var direction = 4;
				}
				if(direction){
					socket.emit("direction change", {
						dir: direction
					});
				}
			});
		}

		return Snake;
	})();

	window.Food = (function(){

		function Food(){
			this.set = [];
			this.colors = [];
		}

		Food.prototype.draw = function(){
			for(var i = 0; i<this.set.length; i++){
				Field.ctx.fillStyle = this.colors[this.set[i].color];
				Field.ctx.fillRect(this.set[i].x+1,this.set[i].y+1,18,18);
			}
		}

		return Food;

	})();
	
})(this,document);