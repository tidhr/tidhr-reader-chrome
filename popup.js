/** Tidhr Reader Extension */
(function(global){
	"use strict";

	/** Deep copy plain variable */
	function copy(o) {
		return JSON.parse(JSON.stringify(o));
	}

	/** Check if variable is object (but not Array) */
	function is_object(a) {
		return ( a && (typeof a === 'object') && (!(a instanceof Array)) ) ? true : false;
	}

	/** Check if variable is array */
	function is_array(a) {
		return (a && (typeof a === 'object') && (a instanceof Array)) ? true : false;
	}

	/** REST Resource Reference */
	function Ref(url) {
		this.url = url;
	}

	Ref.DEFAULT_SERVICE_URL = 'https://reader.tidhr.com/rest';

	/** Convert to string */
	Ref.prototype.toString = function() {
		return this.url;
	};

	/** Parse resource URL */
	Ref.parse = function() {
		var args = Array.prototype.slice.call(arguments);
		function item(i) {
			return (is_array(i) ? i.map(item).join('/') : ''+i).replace(/\/$/, "").replace(/^\//, "");
		}
		var str = ''+args.map(item).join('/');
		if((/^https?:\/\//i).test(str)) {
			return new Ref(str);
		} else {
			return new Ref(Ref.DEFAULT_SERVICE_URL + '/' + str);
		}
	};


	/** REST resource */
	function Resource(url, data, opts) {
		opts = opts || {};
		var self = this;
		self.$ref = Ref.parse(url);

		self.data = data;
	}

	/** Get internal data object */
	Resource.valueOf = function() {
		return copy(self.data);
	};

	/** JSON presentation */
	Resource.toJSON = function() {
		return this.valueOf();
	};

	/** String presentation */
	Resource.toString = function() {
		return 'Resource('+this.$ref+')';
	};

	/** Create resource */
	Resource.create = function(url, opts) {
		return new Resource(url, opts);
	};

	/** Get REST resource */
	Resource.get = function(url, body) {
		if(url === undefined) { url = SERVICE_URL; }
		function build_res(data) {
			if(is_object(data)) {
				return Resource.create.bind(Resource, url)(data);
			} else if(is_array(data)) {
				return data;
			} else {
				// ..everything else should be strings, numbers, etc which we don't need to convert to resources
				return data;
			}
		}
		return $.getJSON(Ref.parse(url), body).done(build_res);
	};

	/** Returns true if the resource is partial */
	Resource.is_partial = function(o) {
		return (o && (o instanceof Resource)) ? false : (o.$ref ? true : false);
	};

	/** Asynchronously expand this resource if it is partial resource. */
	Resource.expand = function(o) {
		if(Resource.is_partial(o)) { return Resource.get(o.$ref); }
		var d = $.Deferred();
		d.resolve(o);
		return d;
	};


	// For debug use in console mode
	if(typeof global.$tidhr === 'undefined') {
		global.$tidhr = {};
	}
	if(typeof global.$tidhr.reader_extension === 'undefined') {
		global.$tidhr.reader_extension = {};
	}
	global.$tidhr.reader_extension = {'Ref': Ref, 'Resource': Resource};

	
	/* Test the code */
	$(function() {

		function render(template, context) {
			var c = $('#feeditem').clone();
			c.removeAttr('id');
			c.find('[data-text]').each(function() {
				var e = $(this);
				var key = e.attr('data-text');
				e.text( context[key] );
				e.removeAttr('data-text');
			});
			c.find('[data-attr]').each(function() {
				var e = $(this);
				var parts = e.attr('data-attr').split('=');
				var attr_key = parts.shift(), data_key = parts.shift();
				e.attr(attr_key.trim(), ''+context[ data_key.trim() ] );
				e.removeAttr('data-attr');
			});
			return c;
		}

		function print_errors(err) {
			console.log('Error: ' + JSON.stringify(err));
		}

		Resource.get('feeds').done(function(feeds) {
			//console.log(JSON.stringify(feeds));
			feeds.forEach(function(pfeed) {
				//console.log(JSON.stringify(pfeed));
				Resource.expand(pfeed).done(function(feed){
					Resource.expand(feed.items).done(function(items) {
						items.forEach(function(item) {
							$("#container").append( render($('#feeditem'), item) );
						});
					}).fail(print_errors);
				}).fail(print_errors);
			});
		}).fail(print_errors);
	});

})(window);
/* EOF */
