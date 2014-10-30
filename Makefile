MINIFIED=tinject.min.js
GZIPPED=tinject.min.js.gz

.PHONY: all clean lint minified gzipped test

all: lint test minified gzipped

clean:
	rm -rf $(MINIFIED) $(GZIPPED)

lint:
	./node_modules/.bin/jshint tinject.js

minified:
	./node_modules/.bin/uglifyjs tinject.js > $(MINIFIED)

gzipped: minified
	gzip -9c $(MINIFIED) > $(GZIPPED)

test:
	npm test
