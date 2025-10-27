function parseTweets(runkeeper_tweets) {
	//Do not proceed if no tweets loaded
	if(runkeeper_tweets === undefined) {
		window.alert('No tweets returned');
		return;
	}

	tweet_array = runkeeper_tweets.map(function(tweet) {
		return new Tweet(tweet.text, tweet.created_at);
	});
	
	//This line modifies the DOM, searching for the tag with the numberTweets ID and updating the text.
	//It works correctly, your task is to update the text of the other tags in the HTML file!
	document.getElementById('numberTweets').innerText = tweet_array.length;	

	//processing the earliest and latest times
	if(tweet_array.length > 0){
		const toDate = (tw) =>
			tw.time instanceof Date ? tw.time : new Date(tw.time || tw.created_at);

		const times = tweet_array.map(toDate);
		const earliest = new Date(Math.min(...times.map(d => d.getTime())));
		const latest   = new Date(Math.max(...times.map(d => d.getTime())));
		
		const fmt = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

		//update the spans 
		document.getElementById('firstDate').innerText = earliest.toLocaleDateString(undefined, fmt);
		document.getElementById('lastDate').innerText  = latest.toLocaleDateString(undefined, fmt);
	
		//updating the spans for completed, live, achievements, and miscellaneous events
		const counts = {
			completed_event: 0,
			live_event: 0,
			achievement: 0,
			miscellaneous: 0
		};

		tweet_array.forEach(t => {
			counts[t.source]++; //increment the right category
		});

		const total = tweet_array.length;
		
		document.querySelectorAll('.completedEvents')
		.forEach(el => el.innerText = counts.completed_event);
		document.querySelectorAll('.liveEvents')
		.forEach(el => el.innerText = counts.live_event);
		document.querySelectorAll('.achievements')
		.forEach(el => el.innerText = counts.achievement);
		document.querySelectorAll('.miscellaneous')
		.forEach(el => el.innerText = counts.miscellaneous);

		//calculating the percentages
		const pct = (n) => math.format(total ? (n/total)*100 : 0, { notation:'fixed', precision:2 }) + '%';

		document.querySelectorAll('.completedEventsPct')
		.forEach(el => el.innerText = pct(counts.completed_event));
		document.querySelectorAll('.liveEventsPct')
		.forEach(el => el.innerText = pct(counts.live_event));
		document.querySelectorAll('.achievementsPct')
		.forEach(el => el.innerText = pct(counts.achievement));
		document.querySelectorAll('.miscellaneousPct')
		.forEach(el => el.innerText = pct(counts.miscellaneous));
	
		//updating the spans for written events
		const completedTweets = tweet_array.filter(t => t.source === 'completed_event');
		const writtenCompletedTweets = completedTweets.filter(t => t.written);

		const numCompleted = completedTweets.length;
		const numWritten = writtenCompletedTweets.length;

		// format percentage to two decimals using math.js
		const writtenPct = math.format(
		numCompleted ? (numWritten / numCompleted) * 100 : 0,
		{ notation: 'fixed', precision: 2 }
		) + '%';

		// ----- Update the spans -----
		document.querySelectorAll('.completedEvents')
		.forEach(el => el.innerText = numCompleted);

		document.querySelectorAll('.written')
		.forEach(el => el.innerText = numWritten);

		document.querySelectorAll('.writtenPct')
		.forEach(el => el.innerText = writtenPct);
	}
}

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
	loadSavedRunkeeperTweets().then(parseTweets);
});