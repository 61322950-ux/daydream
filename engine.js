/* 白日梦引擎 —— 本地梦境生成器
   规则：第二人称、现在时、场景漂移、每拍至多一件不可能的事且人人当它平常。
   全部素材离线内置；AI 模式只是可选增强，不接也能完整体验。 */

const Engine = (() => {
  'use strict';

  // ---------- 随机工具 ----------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;

  // ---------- 气压与色盘 ----------
  const PALETTES = {
    温柔: { bg: '#221a3f', blobs: ['#6b5ca5', '#c98a6b', '#8a6bb3', '#b98a9e'], text: '#efe9ff' },
    漂流: { bg: '#12102e', blobs: ['#4b5bab', '#7a6bb3', '#3b8686', '#6b4b8a'], text: '#e9ecff' },
    荒诞: { bg: '#1c1030', blobs: ['#c25e7a', '#5e79c2', '#d9a441', '#7a4b9e'], text: '#f5eaff' },
    循环: { bg: '#0e1a26', blobs: ['#2e6b7a', '#3b5bab', '#5a4b9e', '#3b8a7a'], text: '#e6f4ff' },
    清醒: { bg: '#191238', blobs: ['#8a5cb8', '#c25e9e', '#5e79c2', '#d9a441'], text: '#f7f0ff' },
  };

  // ---------- 现实渗入 ----------
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const BUCKET_TEXT = { deep: '凌晨', dawn: '清晨', morning: '上午', noon: '中午', afternoon: '下午', dusk: '黄昏', night: '夜里' };

  function seepNow() {
    const d = new Date();
    const h = d.getHours();
    const bucket = h < 5 ? 'deep' : h < 8 ? 'dawn' : h < 11 ? 'morning' : h < 14 ? 'noon' : h < 18 ? 'afternoon' : h < 20 ? 'dusk' : 'night';
    return {
      bucket,
      bucketText: BUCKET_TEXT[bucket],
      h,
      minText: d.getMinutes() < 10 ? '0' + d.getMinutes() : '' + d.getMinutes(),
      week: WEEK[d.getDay()],
    };
  }

  function moodFor(seep, seed, journal) {
    if (seed && /困|累|难过|烦|压力|睡不着|失眠|emo|丧|崩溃|焦虑/.test(seed)) return '温柔';
    // 上一场是循环梦，梦有时会想在同一个地方再错一次
    if (journal && journal[0] && journal[0].mood === '循环' && chance(0.3)) return '循环';
    const table = {
      deep: ['温柔', '漂流', '漂流', '荒诞'],
      dawn: ['漂流', '温柔'],
      morning: ['漂流', '荒诞'],
      noon: ['漂流', '荒诞'],
      afternoon: ['漂流', '漂流', '荒诞'],
      dusk: ['温柔', '漂流'],
      night: ['温柔', '漂流', '漂流', '循环'],
    };
    return pick(table[seep.bucket] || ['漂流']);
  }

  const OPENERS = {
    deep: (s) => `现在是${s.bucketText}${s.h}点${s.minText}分，星期${s.week}，全世界最软的时间。你还没睡，但"醒着"这个词已经开始不太好用了。`,
    dawn: (s) => `${s.bucketText}${s.h}点${s.minText}分，天在亮和没亮之间。这个时段存在的东西不多，你算一个。`,
    morning: (s) => `${s.bucketText}${s.h}点${s.minText}分，星期${s.week}。今天已经开始了一阵子，但还没开始认真。`,
    noon: (s) => `${s.bucketText}${s.h}点${s.minText}分。太阳在头顶站得笔直，但影子们都有点困。`,
    afternoon: (s) => `${s.bucketText}${s.h}点${s.minText}分，星期${s.week}。下午的这半个小时本来就归你，只是你平时忘了来领。`,
    dusk: (s) => `${s.bucketText}${s.h}点${s.minText}分，天正在关灯，但没关死。`,
    night: (s) => `${s.bucketText}${s.h}点${s.minText}分，星期${s.week}。夜刚起头，事情都还来得及不作数。`,
  };

  // ---------- 素材池 ----------
  const SCENES = [
    { short: '末班火车', img: '玻璃瓶里的报站声',
      text: ['你站在一节绿皮车厢的连接处，灯是旧的那种黄。窗外的夜往后退，退得不紧不慢，像有人在替你翻一本读过一半的书。',
             '车厢里很空，但每个座位上都搭着一件像是有人刚刚才离开的外套。广播报站，报的站名一个都不认识，但听着都不错。'],
      anchors: ['风从门缝里进来，带着铁轨和旧报纸的味道', '报站声在空车厢里荡了一下才落地'] },
    { short: '深夜便利店', img: '给过期时间挠头的店员',
      text: ['便利店的冷柜嗡嗡响着，把这一小块夜照得很白。关东煮的雾往上走，走到一半就懒得走了，停在半空。',
             '店员趴在柜台上看一本翻倒的杂志，货架深处传来讲价的录音，用的是去年冬天的声音。'],
      anchors: ['冷空气贴着手背，凉得很客气', '冰柜的嗡嗡声像一支没唱完的歌'] },
    { short: '闭馆的水族馆', img: '在加班的鲨鱼',
      text: ['闭馆后的水族馆只剩蓝光，一整面一整面的蓝，像天黑透之后天空自己留着的那部分。鱼群慢慢游，游得像在散步。',
             '玻璃另一面有什么在呼吸，不是鱼——鱼不这么呼吸。你凑近看，它也凑近看，然后很客气地先退开了。'],
      anchors: ['水汽贴着脸，咸得很轻', '远处有钟声泡在水里传过来，是钝的'] },
    { short: '云的候机厅', img: '以心情命名的登机口',
      text: ['候机厅的椅子软得恰到好处，像专门量过你今天有多累。登机口的牌子不写地名，写心情——这一班飞"释然"，下一班飞"小时候的夏天"。',
             '广播不报时间，只报云况：今晚多云转散，散了就不补。有云在窗外退房，行李很少。'],
      anchors: ['空气里有很淡的、刚下过雨的跑道味', '广播的声音像从玻璃瓶里倒出来的'] },
    { short: '屋顶泳池', img: '往侧面延伸的扶梯',
      text: ['屋顶泳池的水面很平，平得像有人刚熨过。水面映着别人家的电视，一闪一闪，演到哪算哪。',
             '扶梯从水里伸出来，但不往上，往侧面——侧面有一小片天，踩上去是实的。'],
      anchors: ['氯水味混着夜风，是夏天快结束的味道', '水底的灯偶尔亮一格，像谁在数数'] },
    { short: '旧教室', img: '记住了所有人的黑板',
      text: ['旧教室的粉笔灰在光里排队，排得很整齐，队尾排到了窗户外面。课桌按年份摆，越往里越旧。',
             '黑板擦得很干净，但凑近了看，擦掉的字都还在，一层一层，像树的年轮。'],
      anchors: ['粉笔灰的味道，干燥又安静', '吊扇转得很慢，慢得像在犹豫'] },
    { short: '末班站台', img: '跟你挥手但不是告别的广告牌',
      text: ['末班车刚走，站台上还留着它的风。广告牌里的人朝你挥手，不是告别，更像"你也还没走啊"。',
             '广播只剩气声，长椅是温的，像刚有人替你坐热。'],
      anchors: ['轨道那边传来很远的电流声', '有股雨下到一半的气味'] },
    { short: '洗衣店', img: '烘干机里晾着的云',
      text: ['洗衣店的滚筒把星期转软。墙上贴着价目表，最后一条写着"心事另计，不贵"。',
             '烘干机滚着，滚出一小朵一小朵的云，攒在机器顶上，是别人忘拿的。'],
      anchors: ['洗衣粉的香，干净得有点不真实', '滚筒的声音很稳，像一列不会晚点的火车'] },
    { short: '夜航缆车', img: '变成电路板的城市',
      text: ['缆车往山里走，脚下的城市慢慢变成一块通电的电路板，哪里亮着，哪里就在醒着。',
             '车厢里只有你和一盏小灯。缆绳在头顶轻轻响，一下，一下，像有人在很远的地方数你的心跳。'],
      anchors: ['钢缆的味道混着松林的风', '车厢轻轻晃，晃得刚好能原谅今天'] },
    { short: '图书馆B区', img: '在找自己的索引卡',
      text: ['B区没有人来，书架之间宽得能散步。书页偶尔自己翻一页，不是风，是有的书想跳到好看的段落。',
             '索引卡的抽屉半开着，卡片一张一张爬出来，在桌上排队，找自己原来的位置。'],
      anchors: ['旧纸页的味道，像时间本来的气味', '顶灯有一点点电流声，像灯在自言自语'] },
    { short: '灯塔', img: '顺时针往下的楼梯',
      text: ['灯塔的光每十二秒扫一次海，扫过的时候，整间屋子跟着亮一下，像有人帮你翻页。海在下面很安静，安静得能听见它换气。',
             '楼梯往下绕，顺时针，越走越靠近海面，但始终差一层——这层差的一层，谁也不着急。'],
      anchors: ['咸腥的风，凉得很提神', '墙上挂着旧航图，标着一个明天才存在的暗礁'] },
    { short: '自动贩卖机', img: '掉下来是温的罐子',
      text: ['贩卖机的灯箱照亮一小块夜，亮得像一个正经的建议。里面摆的饮料名字都很陌生，但每一样看着都想买。',
             '你投了一枚不知道哪来的硬币，罐子掉下来，是温的——像有人刚从口袋里拿出来递给你。'],
      anchors: ['灯箱的电流声嗡嗡的，很尽忠职守', '夜风穿过货架间，有一点铁锈的甜味'] },
  ];

  const IMPOSSIBLES = [
    { t: '云在窗外退房，一层楼从另一层里慢慢抽出来，像抽屉。没人觉得这有什么。', obj: '退房的云', img: '退房的云' },
    { t: '站牌上的字游了一圈，回到原位，装作没动过。', obj: '游动的站牌', img: '游动的站牌' },
    { t: '一群鱼从空气里过马路。等红灯的是你。', obj: '过马路的鱼', img: '过马路的鱼' },
    { t: '雨只下一半，另一半停在半空，等一个说法。', obj: '下了一半的雨', img: '下了一半的雨' },
    { t: '影子先回家了，门上留了字条：别锁门。', obj: '先回家的影子', img: '先回家的影子' },
    { t: '月亮插着充电线，电量84%，充得很慢，但很稳。', obj: '充电的月亮', img: '充电的月亮' },
    { t: '电梯的按钮只有两个字：暂时。全楼的人都用它，都很满意。', obj: '写着暂时的电梯', img: '写着暂时的电梯' },
    { t: '楼梯多出一层。谁都不数它，它也就不吵。', obj: '多出的一层楼梯', img: '多出的一层楼梯' },
    { t: '街角的电话亭在响。接起来，是明天的你，说了句"没事"，就挂了。', obj: '响着的电话亭', img: '响着的电话亭' },
    { t: '雪落下来是暖的，像有人提前焐过一整个冬天。', obj: '焐过的雪', img: '焐过的雪' },
    { t: '红绿灯这会儿不负责车，只负责心情。现在是绿的，说明大家都还行。', obj: '只管心情的红绿灯', img: '只管心情的红绿灯' },
    { t: '海在很远的地方翻页，翻到好看的地方，浪就大一点。', obj: '翻页的海', img: '翻页的海' },
  ];

  const ANCHORS = [
    '出租车里有股雨下到一半的气味', '空气里有刚洗过的棉布味', '远处有人在洗牌，声音很轻',
    '有股很淡的栀子花香，找不到来源', '台阶被晒了一下午，还是温的', '潮气贴着脚踝，凉得很客气',
    '咖啡凉了，但凉得很值得', '风里有一点别的季节的味道', '风从门缝里进来，带着旧纸箱的味道',
  ];

  const CHARACTERS = [
    '一个抱着枕头路过的人跟你点头："你也先住着？"',
    '穿旧校服的售票员在补票。她记得每个人都欠一张票钱，但从来不要。',
    '天台上有位阿姨在晾星星，收衣服的时候顺便收月亮。',
    '一个收集站名的孩子，本子上全是没去过的地方。',
    '前台坐着一只猫，工牌上写着"还没想好"，业务很熟练。',
    '大爷在遛一条不存在的狗。狗很配合，你也很配合。',
    '值夜班的猫用你的小名喊你。你想不起来自己有过这个小名，但答应了。',
    '队伍最后有个人永远轮不到。他不急，他说排着本身就挺好。',
  ];

  const THRESHOLDS = [
    '屏幕的光忽然变得很重，顺着桌沿往下淌，淌到地上就成了一层浅浅的水。你踩进去，水是暖的，带着充电器微微发热的那种暖。',
    '楼梯数着数着多出一层。你想着回头再算，脚已经先下去了。',
    '电梯来了，按钮里多了一个没见过的字。你按下去，电梯叹了口气开始往下走——不像下楼，像下潜。',
    '公交坐过了一站。你想坐回来，车就倒着开了回来，全车没有一个人觉得奇怪。',
    '泡面等开的三分钟里你走了神。走进去的时候，汤还是烫的。',
    '键盘的缝隙里透出光。你把F键抠起来，里面是一段往下的楼梯。',
    '窗帘的褶皱里夹着一小片没醒的夜。你把它展开铺在地上，走了进去。',
    '手机屏幕上，时间开头那个数字看久了变成一扇门。你推开它，门后面是走廊。',
  ];

  const SEED_LEADS = [
    '你想着「{s}」，想着想着——',
    '你把「{s}」轻轻放在一边，先去别处看看——',
    '「{s}」在你脑子里晃了一下，晃出一条缝——',
  ];

  const SEED_WEAVES = [
    '在这里，「{s}」不用解释，大家都有。',
    '你把「{s}」放进外套口袋。这里替你保管，不问来路。',
    '「{s}」在这里长出了一层新意思，不大声，但你看得见。',
  ];

  const CAMEO_TPL = [
    '有一件东西你见过：{img}。不是在这一场里见到的，但梦不打算解释。',
    '{img}又出现了。你没问它怎么来的，它也没问你最近怎么样，这样很好。',
  ];

  const LUCID_OK = [
    '你说到做到。梦先愣了半秒，然后开始执行。',
    '这一次，梦听了你的。',
    '话音刚落，梦就开始重新排版。',
  ];

  const LUCID_COST = [
    '代价是地面从现在起记仇，走直线会轻微打滑。',
    '代价是所有颜色往左错了一寸——蓝色现在是凉的橙子。',
    '代价是刚才跟你点头的人忘了你，礼貌得像初次见面。',
    '代价是走廊从这一步开始变长，而你走的速度没变。',
    '代价是时间打了个嗝，接下来两分钟属于上个月。',
    '代价是梦的清晰度掉了百分之十。换来的那点自由，你算了算，还是值的。',
  ];

  const WAKE_SOUNDS = {
    deep: ['手机屏幕自己亮了一下，又自己暗下去', '冰箱压缩机在黑夜里咔哒一声启动', '远处有一辆车碾过减速带，像谁翻了个身'],
    dawn: ['楼下有鸟开始分第一批太阳', '水壶提前醒了，比所有人都有精神'],
    morning: ['键盘声从走廊尽头传过来', '一杯水在桌上凉到正好喝的温度'],
    noon: ['手机在口袋里震了一下，又安分了', '空调风吹在手背上，很守时'],
    afternoon: ['空调风吹在手背上', '楼下有孩子放学，声音先是密的，然后散了'],
    dusk: ['楼上的灯一盏一盏亮起来', '谁家开始做饭，香味先到'],
    night: ['洗衣机进了脱水环节，像远方一阵短雨', '微信在桌面上亮了一下，又灭了'],
  };

  const ARTIFACTS = [
    '一张车票，终点站的名字被水洇开了一半，剩下那一半，你认得。',
    '一张便签，用你的笔迹写着"先住着"。可你今天没写过字。',
    '一个玻璃瓶，拧开有半句报站声。',
    '半页信，收件人那栏空着，但你知道是谁的。',
    '一颗还温的星星。凉了就是普通的石头，所以你一直没放手。',
    '一枚下过雨的贝壳，贴在耳边，是今天下午。',
    '一格楼梯，从口袋里掏出来的时候，还有一点点回声。',
    '一粒没发出去的站名，捏在手里会轻轻动。',
  ];

  const HOOKS = [
    '{obj}那边还有半段路没走完，下次接着走。',
    '{obj}欠你一句话，梦记着账。',
    '下次去，{obj}应该还在原地。',
  ];

  const TITLES = ['{sA}与{obj}', '{sB}，和{obj}', '没起名的{sA}', '{sA}，{obj}'];

  // ---------- 组装 ----------
  function sentence(s) { return /[。！？…"」]$/.test(s) ? s : s + '。'; }

  function buildDream({ seed, journal }) {
    const seep = seepNow();
    const mood = moodFor(seep, seed, journal);
    const recentScenes = (journal && journal[0] && journal[0].scenes) || [];
    const poolA = SCENES.filter((s) => !recentScenes.includes(s.short));
    const sceneA = pick(poolA.length ? poolA : SCENES);
    const sceneB = pick(SCENES.filter((s) => s.short !== sceneA.short));
    const imp = pick(IMPOSSIBLES);
    const character = pick(CHARACTERS);
    const artifact = pick(ARTIFACTS);
    const anchorExtra = pick(ANCHORS.filter((a) => !sceneA.anchors.includes(a)));
    const wakeSound = pick(WAKE_SOUNDS[seep.bucket]);

    // 旧梦意象回收（梦的余味）
    let cameo = null;
    const oldImgs = [];
    (journal || []).slice(0, 3).forEach((r) => (r.imagery || []).forEach((i) => oldImgs.push(i)));
    const fresh = oldImgs.filter((i) => i !== sceneA.img && i !== sceneB.img && i !== imp.img);
    if (fresh.length && chance(0.85)) cameo = pick(fresh);

    const beats = [];
    // 拍一：现实渗入
    beats.push(OPENERS[seep.bucket](seep));
    // 拍二：入梦通道 + 抵达场景A
    const lead = seed ? pick(SEED_LEADS).replace('{s}', seed) : '';
    beats.push(sentence(lead + pick(THRESHOLDS)) + sceneA.text[0] + sentence(pick(sceneA.anchors)));
    // 拍三：场景A深处 + 角色
    const weave = seed ? ' ' + pick(SEED_WEAVES).replace('{s}', seed) : '';
    beats.push(sceneA.text[1] + weave + sentence(character));
    // 拍四：切场景B + 不可能事件
    let b4 = sceneB.text[0] + imp.t;
    if (cameo) b4 += ' ' + pick(CAMEO_TPL).replace('{img}', cameo);
    b4 += sentence(anchorExtra);
    beats.push(b4);
    // 拍五（可选）：收束
    if (chance(0.5)) beats.push(sceneB.text[1] + '你总觉得这场梦里还有半句话没说完。也许下次来，它会说完。');

    const title = pick(TITLES).replace('{sA}', sceneA.short).replace('{sB}', sceneB.short).replace('{obj}', imp.obj);
    const hook = pick(HOOKS).replace('{obj}', imp.obj);

    return {
      title, mood, beats, artifact, wakeSound, ai: false,
      record: {
        ts: Date.now(), title, mood, seed: seed || null,
        scenes: [sceneA.short, sceneB.short],
        imagery: [sceneA.img, imp.img, sceneB.img],
        hook,
      },
      _ctx: { seep, unusedAnchors: ANCHORS.filter((a) => a !== anchorExtra), unusedImps: IMPOSSIBLES.filter((i) => i !== imp) },
    };
  }

  // 用户转清醒后，梦接不上时用的备用拍
  function spareBeat(dream) {
    const c = dream._ctx;
    const a = c.unusedAnchors.length ? c.unusedAnchors.splice(Math.floor(Math.random() * c.unusedAnchors.length), 1)[0] : pick(ANCHORS);
    const imp = c.unusedImps.length ? c.unusedImps.splice(Math.floor(Math.random() * c.unusedImps.length), 1)[0] : pick(IMPOSSIBLES);
    return '梦往前挪了一步，像给你腾地方。' + imp.t + sentence(a);
  }

  function lucidBeat() {
    return pick(LUCID_OK) + pick(LUCID_COST);
  }

  return { seepNow, moodFor, PALETTES, buildDream, spareBeat, lucidBeat };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
