.PHONY: all clean minified gzipped

MINIFIED=tinject.min.js
GZIPPED=tinject.min.js.gz

all: minified gzipped

clean:
	rm -rf $(MINIFIED) $(GZIPPED)

minified:
	./node_modules/.bin/uglifyjs tinject.js > $(MINIFIED)

gzipped: minified
	gzip -9c $(MINIFIED) > $(GZIPPED)
