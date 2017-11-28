//http://easings.net/
//https://github.com/tweenjs/tween.js/blob/master/src/Tween.js

function elasticOut(k){
	if (k === 0) return 0;
	if (k === 1) return 1;
	return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;
}

function elasticIn(k){
	if (k === 0) return 0;
	if (k === 1) return 1;
	return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
} 