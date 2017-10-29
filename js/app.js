// 常用的元素和变量
var $body = $(document.body);
var score = 0;
// 画布相关
var $canvas = $('#game');  // 通过id为game来获取canvas
var canvas = $canvas.get(0); //获取canvas数组中的第一个。
var context = canvas.getContext("2d");
// 设置画布的宽度和高度
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 设置画布中字体
context.font = '30px arial';

// 获取画布相关信息
var canvasWidth = canvas.clientWidth;
var canvasHeight = canvas.clientHeight;

// 判断是否有 requestAnimationFrame 方法，如果有则模拟实现
window.requestAnimFrame =
window.requestAnimationFrame ||
window.webkitRequestAnimationFrame ||
window.mozRequestAnimationFrame ||
window.oRequestAnimationFrame ||
window.msRequestAnimationFrame ||
function(callback) {
    window.setTimeout(callback, 1000 / 30);
};


/**
 * 基本事件绑定
 */
function bindEvent() {
  // 绑定事件
  var self = this;
  // 点击开始按钮
  $body.on('click', '.js-start', function() {
    $body.attr('data-status', 'start');
    // 开始游戏
    GAME.start();
  });


  // 点击说明按钮
  $body.on('click', '.js-rule', function() {
    $body.attr('data-status', 'rule');
  });

  // 点击设置按钮
  $body.on('click', '.js-setting', function() {
    $body.attr('data-status', 'setting');
  });

  // 点击确认设置按钮
  $body.on('click', '.js-confirm-setting', function() {
    $body.attr('data-status', 'index');
    // 设置游戏
    // GAME.init();
  });

  // 点击我知道了规则的按钮
  $body.on('click', '.js-confirm-rule', function() {
    $body.attr('data-status', 'index');
  });
}


/**
 * 游戏对象
 */
var GAME = {
  /**
   * 游戏初始化
   */
  init: function(opts) {
    // 设置opts
    var opts = Object.assign({}, opts, CONFIG);
    this.opts = opts;
    
    // 计算飞机初始坐标
    this.planePosX = canvasWidth / 2 - opts.planeSize.width / 2;
    this.planePosY = canvasHeight - opts.planeSize.height - 50;
    
    // console.log(this.opts);
  },
  /**
   * 游戏开始需要设置
   */
  start: function () {
    // 获取游戏初始化 level
    var self = this; // 保存函数调用对象（即Game）
    var opts = this.opts;
    var images = this.images;
    // 清空射击目标对象数组和分数设置为 0
    this.enemies = []; 
    this.score = 0;

    // 随机生成大小敌机
    this.createSmallEnemyInterval = setInterval(function () {
      self.createEnemy('normal');
    }, 500);
    this.createBigEnemyInterval = setInterval(function () {
      self.createEnemy('big');
    }, 1500);

    // 创建主角英雄
    this.plane = new Plane({
      x: this.planePosX,
      y: this.planePosY,
      width: opts.planeSize.width,
      height: opts.planeSize.height,
      // 子弹尺寸速度
      bulletSize: opts.bulletSize, 
      bulletSpeed: opts.bulletSpeed, 
      // 图标相关
      icon: resourceHelper.getImage('bluePlaneIcon'),
      bulletIcon: resourceHelper.getImage('fireIcon'),
      boomIcon: resourceHelper.getImage('enemyBigBoomIcon')
    });
    // 飞机开始射击
    this.plane.startShoot();

    
    // 开始更新游戏
    this.update();
  },
  update: function () {
    var self = this;
    var opts = this.opts;
    // 更新飞机、敌人
    this.updateElement();

    // 先清理画布
    context.clearRect(0, 0, canvasWidth, canvasHeight);
 
    if (this.plane.status === 'boomed') {
      this.end();
      return;
    }

    // 绘制画布
    this.draw();
    
    // 不断循环 update
    requestAnimFrame(function() {
      self.update()
    });
  },
 
  /**
   * 更新当前所有元素的状态
   */
  updateElement: function() {
    var opts = this.opts;
    var enemySize = opts.enemySize;
    var enemies = this.enemies;
    var plane = this.plane;
    var i = enemies.length;
    
    if (plane.status === 'booming') {
      plane.booming();
      return;
    }


    // 循环更新敌人
    while (i--) {
      var enemy = enemies[i];
      enemy.down();

      if (enemy.y >= canvasHeight) {
        this.enemies.splice(i, 1);
      } else {
        // 判断飞机状态
        if (plane.status === 'normal') {
          if (plane.hasCrash(enemy)) {
            plane.booming();
          }
        }
        // 根据怪兽状态判断是否被击中
        switch(enemy.status) {
          case 'normal':
            if (plane.hasHit(enemy)) {
              enemy.live -= 1;
              if (enemy.live === 0) {
                enemy.booming();
              }
            }
            break;
          case 'booming':
            enemy.booming();
            break;
          case 'boomed':
            enemies.splice(i, 1);
            break;
        }
      }
    }
  },
  /**
   * 绑定手指触摸
   */
  bindTouchAction: function () {
    var opts = this.opts;
    var self = this;
    // 飞机极限横坐标、纵坐标
    var planeMinX = 0;
    var planeMinY = 0;
    var planeMaxX = canvasWidth - opts.planeSize.width;
    var planeMaxY = canvasHeight - opts.planeSize.height;
    // 手指初始位置坐标
    var startTouchX;
    var startTouchY;
    // 飞机初始位置
    var startPlaneX;
    var startPlaneY;
  
    // 首次触屏
    $canvas.on('touchstart', function (e) {
      var plane = self.plane;
      // 记录首次触摸位置
      startTouchX = e.touches[0].clientX;
      startTouchY = e.touches[0].clientY;
      // console.log('touchstart', startTouchX, startTouchY);
      // 记录飞机的初始位置
      startPlaneX = plane.x;
      startPlaneY = plane.y;
  
    });
    // 滑动屏幕
    $canvas.on('touchmove', function (e) {
      var newTouchX = e.touches[0].clientX;
      var newTouchY = e.touches[0].clientY;
      // console.log('touchmove', newTouchX, newTouchY);
      
      // 新的飞机坐标等于手指滑动的距离加上飞机初始位置
      var newPlaneX = startPlaneX + newTouchX - startTouchX;
      var newPlaneY = startPlaneY + newTouchY - startTouchY;
      // 判断是否超出位置
      if(newPlaneX < planeMinX){
        newPlaneX = planeMinX;
      }
      if(newPlaneX > planeMaxX){
        newPlaneX = planeMaxX;
      }
      if(newPlaneY < planeMinY){
        newPlaneY = planeMinY;
      }
      if(newPlaneY > planeMaxY){
        newPlaneY = planeMaxY;
      }
      // 更新飞机的位置
      self.plane.setPosition(newPlaneX, newPlaneY);
      // 禁止默认事件，防止滚动屏幕
      e.preventDefault();
    });
  },

  /**
   * 生成怪兽
   */
  createEnemy: function(enemyType) {
    var enemies = this.enemies;
    var opts = this.opts;
    var images = this.images || {};
    var enemySize = opts.enemySmallSize;
    var enemySpeed = opts.enemySpeed;
    var enemyIcon = resourceHelper.getImage('enemySmallIcon');
    var enemyBoomIcon = resourceHelper.getImage('enemySmallBoomIcon');
  
  
    var enemyLive = 1; 
  
    // 大型敌机参数
    if (enemyType === 'big') {
      enemySize = opts.enemyBigSize;
      enemyIcon = resourceHelper.getImage('enemyBigIcon');
      enemyBoomIcon = resourceHelper.getImage('enemyBigBoomIcon');
      enemySpeed = opts.enemySpeed * 0.6;
      enemyLive = 10;
    } 
  
    // 综合元素的参数
    var initOpt = {
      x: Math.floor(Math.random() * (canvasWidth - enemySize.width)), 
      y: -enemySize.height,
      enemyType: enemyType,
      live: enemyLive,
      width: enemySize.width,
      height: enemySize.height,
      speed: enemySpeed,
      icon: enemyIcon,
      boomIcon: enemyBoomIcon
    }
  
    // 怪兽的数量不大于最大值则新增
    if (enemies.length < opts.enemyMaxNum) {
      enemies.push(new Enemy(initOpt));
    }
  
    // console.log(enemies);
  },
  end: function() {
    alert('游戏结束');
  },
  draw: function() {
    this.enemies.forEach(function(enemy) {
      enemy.draw();
    });
    this.plane.draw();
  }
};

/**
 * 页面主入口
 */
function init() {
  // 加载图片资源，加载完成才能交互
  resourceHelper.load(CONFIG.resources, function(resources) {
    // 加载完成
    GAME.init();
    // 绑定手指事件
    GAME.bindTouchAction();
    bindEvent();
  });
  
}

init();