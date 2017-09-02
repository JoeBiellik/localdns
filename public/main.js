/* global $ */

$(function() {
	$('[data-toggle="tooltip"]').tooltip();

	var ip = $('#ip').text();
	var domain = $('#domain').text();

	$.get('/status.json', function(data) {
		$('#status #spinner').hide();

		var resolveMatch = !data.dns.error && data.dns.result == ip;

		$('#status #results #dns').addClass(!resolveMatch ? 'bg-danger' : 'bg-success');
		$('#status #results #dns p').text(domain + (data.dns.error ? ' does not resolve' : ' resolves to ' + data.dns.result));

		$('#status #results #ping').addClass(data.ping.error ? 'bg-warning' : 'bg-success');
		$('#status #results #ping p').text((resolveMatch ? domain : ip) + ' is ' + (data.ping.error ? 'not ' : '') + 'replying to pings');

		$('#status #results #http').addClass(data.http.error ? 'bg-warning' : 'bg-success');
		$('#status #results #http p').text('http://' + (resolveMatch ? domain : ip) + (data.http.result ? ' returns status code ' + data.http.result : ' could not be reached'));

		$('#status #results').show();
	});
});
