function parseTweets(runkeeper_tweets) {
	//Do not proceed if no tweets loaded
	if(runkeeper_tweets === undefined) {
		window.alert('No tweets returned');
		return;
	}

	tweet_array = runkeeper_tweets.map(function(tweet) {
		return new Tweet(tweet.text, tweet.created_at);
	});
	
	//processing the earliest and latest times
	if(tweet_array.length > 0){
		const toDate = (tw) =>
		tw.time instanceof Date ? tw.time : new Date(tw.time || tw.creeated_at);

		const times = tweet_array.map(toDate);
		const earliest = new Date(Math.min(...times.map(d => d.getTime())));
		const latest   = new Date(Math.max(...times.map(d => d.getTime())));
		
		const fmt = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

		//update the spans 
		document.getElementById('firstDate').innerText = earliest.toLocaleDateString(undefined, fmt);
		document.getElementById('lastDate').innerText  = latest.toLocaleDateString(undefined, fmt);
	}
	//This line modifies the DOM, searching for the tag with the numberTweets ID and updating the text.
	//It works correctly, your task is to update the text of the other tags in the HTML file!
	document.getElementById('numberTweets').innerText = tweet_array.length;	
}

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
	loadSavedRunkeeperTweets().then(parseTweets);
});