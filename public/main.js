$(document).ready(function() {
	$.get('/status.json', function(data) {
		$('#status #spinner').hide();

		$('#status #results #dns').addClass(data.dns.error ? 'card-danger' : 'card-success');
		$('#status #results #dns p span').text(data.dns.result[0]);

		$('#status #results #ping').addClass(data.ping.error ? 'card-warning' : 'card-success');
		$('#status #results #ping p span').text(data.http.error ? 'not ' : '');

		$('#status #results #http').addClass(data.http.error ? 'card-danger' : 'card-success');
		$('#status #results #http p span').text(data.http.result);

		$('#status #results').show();
	});
});
