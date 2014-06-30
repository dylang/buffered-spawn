var spawn = require('cross-spawn');
var createError = require('err-code');
var Q = require('q');

function execute(command, args, options) {
    var process;
    var stderr = new Buffer('');
    var stdout = new Buffer('');
    var deferred = Q.defer();

    // Buffer output, reporting progress
    process = spawn(command, args, options);
    process.stdout.on('data', function (data) {
        stdout = Buffer.concat([stdout, data]);
        deferred.notify(data);
    });
    process.stderr.on('data', function (data) {
        stderr = Buffer.concat([stderr, data]);
        deferred.notify(data);
    });

    // If there is an error spawning the command, reject the promise
    process.on('error', function (error) {
        return deferred.reject(error);
    });

    // Listen to the close event instead of exit
    // They are similar but close ensures that streams are flushed
    process.on('close', function (code) {
        var fullCommand;
        var error;

        if (code) {
            // Generate the full command to be presented in the error message
            if (!Array.isArray(args)) {
                args = [];
            }

            fullCommand = command;
            fullCommand += args.length ? ' ' + args.join(' ') : '';

            // Build the error instance
            error = createError('Failed to execute "' + fullCommand + '", exit code of #' + code, 'ECMDERR', {
                details: stderr,
                status: code
            });

            return deferred.reject(error);
        }

        return deferred.resolve({
            stdout: stdout.toString(),
            stderr: stderr.toString()
        });
    });

    return deferred.promise;
}

function buffered(command, args, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = null;
    }

    if (typeof args === 'function') {
        callback = args;
        args = options = null;
    }

    return execute(command, args, options)
    .nodeify(callback);
}

module.exports = buffered;