// Copyright © 2017 DWANGO Co., Ltd.

describe("FunctionChannelSpec", function() {
    var fc = require("../lib/FunctionChannel.js");
    var dc = require("../node_modules/@cross-border-bridge/data-channel/lib/index.js");
    var db = require("../node_modules/@cross-border-bridge/memory-queue-data-bus/lib/index.js");
    var mq = require("../node_modules/@cross-border-bridge/memory-queue/lib/index.js");
    var dummyDataChannel = new Object();
    var functionChannel;
    var handler;
    var object;

    it("constructor", function() {
        dummyDataChannel.addHandler = function() {
            expect(1).toEqual(arguments.length);
            handler = arguments[0];
        }
        functionChannel = new fc.FunctionChannel(dummyDataChannel);
    });

    it("bind", function() {
        object = new Object();
        functionChannel.bind("objectId", object);
    });

    it("receive OMI (ObjectNotBound)", function() {
        handler(["omi", ["hoge", "foo", [1, 2, 3]]], function(packet) {
            console.log(JSON.stringify(arguments));
            expect("err").toEqual(packet[0]);
            expect("ObjectNotBound").toEqual(packet[1]);
        });
    });

    it("receive OMI (MethodNotExist)", function() {
        handler(["omi", ["objectId", "foo", [1, 2, 3]]], function(packet) {
            console.log(JSON.stringify(arguments));
            expect("err").toEqual(packet[0]);
            expect("MethodNotExist").toEqual(packet[1]);
        });
    });

    it("receive OMI (normal)", function() {
        object.testFunction = function(arg1, arg2, arg3) {
            console.log(JSON.stringify(arguments));
            expect(1).toEqual(arg1);
            expect(2).toEqual(arg2);
            expect(3).toEqual(arg3);
            return "OK";
        }
        handler(["omi", ["objectId", "testFunction", [1, 2, 3]]], function(packet) {
            console.log(JSON.stringify(arguments));
            expect("edo", packet[0]);
            expect("OK", packet[1][0]);
        });
    });

    it("receive UNKNOWN", function() {
        object.testFunction = function(arg1, arg2, arg3) {
            expect(true).toBeFalsy();
            return "NG";
        }
        handler(["UNK", []], function(packet) {
            expect(true).toBeFalsy();
        });
    });

    it("invoke (PUSH)", function() {
        dummyDataChannel.send = function(packet, callback) {
            console.log(JSON.stringify(packet));
            expect("omi", packet[0]);
            expect("id", packet[1][0]);
            expect("method", packet[1][1]);
            expect("a", packet[1][2][0]);
            expect("b", packet[1][2][1]);
            expect("c", packet[1][2][2]);
            expect(callback).toBeUndefined();
        }
        functionChannel.invoke("id", "method", ["a", "b", "c"]);
    })

    it("invoke (REQUEST)", function() {
        dummyDataChannel.send = function(packet, callback) {
            console.log(JSON.stringify(packet));
            expect("omi", packet[0]);
            expect("id", packet[1][0]);
            expect("method", packet[1][1]);
            expect("a", packet[1][2][0]);
            expect("b", packet[1][2][1]);
            expect("c", packet[1][2][2]);
            callback(undefined, ["edo", "RESPONSE", "with", "args"]);
        }
        functionChannel.invoke("id", "method", ["a", "b", "c"], function(error, ...results) {
            console.log(JSON.stringify(arguments));
            expect(error).toBeUndefined();
            expect(results).toEqual(["RESPONSE", "with", "args"]);
        });
    })

    it("invoke (ERROR)", function() {
        dummyDataChannel.send = function(packet, callback) {
            console.log(JSON.stringify(packet));
            expect("omi", packet[0]);
            expect("id", packet[1][0]);
            expect("method", packet[1][1]);
            expect("a", packet[1][2][0]);
            expect("b", packet[1][2][1]);
            expect("c", packet[1][2][2]);
            callback(undefined, ["err", "TestErrorType"]);
        }
        functionChannel.invoke("id", "method", ["a", "b", "c"], function(error, result) {
            console.log(JSON.stringify(arguments));
            expect("TestErrorType").toEqual(error);
            expect(result).toBeUndefined();
        });
    });

    it("invoke (ERROR:DC)", function() {
        dummyDataChannel.send = function(packet, callback) {
            console.log(JSON.stringify(packet));
            expect("omi", packet[0]);
            expect("id", packet[1][0]);
            expect("method", packet[1][1]);
            expect("a", packet[1][2][0]);
            expect("b", packet[1][2][1]);
            expect("c", packet[1][2][2]);
            callback("DataChannelError");
        }
        functionChannel.invoke("id", "method", ["a", "b", "c"], function(error, result) {
            console.log(JSON.stringify(arguments));
            expect("DataChannelError").toEqual(error);
            expect(result).toBeUndefined();
        });
    });

    it("unbind", function() {
        functionChannel.unbind("objectId");
        handler(["omi", ["objectId", "foo", [1, 2, 3]]], function(packet) {
            console.log(JSON.stringify(arguments));
            expect("err").toEqual(packet[0]);
            expect("ObjectNotBound").toEqual(packet[1]);
        });
    });

    it("destroy", function() {
        expect(functionChannel.destroyed()).toBeFalsy();
        dummyDataChannel.removeHandler = function(h) {
            expect(handler).toEqual(h);
        }
        functionChannel.destroy();
        expect(functionChannel.destroyed()).toBeTruthy();
    });

    it("after-destroy", function() {
        functionChannel.bind();
        handler();
        functionChannel.unbind();
        functionChannel.invoke();
        functionChannel.destroy();
    });

    it("combined-test", function() {
        var mq1 = new mq.MemoryQueue();
        var mq2 = new mq.MemoryQueue();

        // 送信側FunctionChannelを作成
        var dataBusS = new db.MemoryQueueDataBus(mq1, mq2);
        var dataChannelS = new dc.DataChannel(dataBusS);
        var functionChannelS = new fc.FunctionChannel(dataChannelS);

        // 受信側FunctionChannelを作成
        var dataBusR = new db.MemoryQueueDataBus(mq2, mq1);
        var dataChannelR = new dc.DataChannel(dataBusR);
        var functionChannelR = new fc.FunctionChannel(dataChannelR);

        // 受信側FunctionChannelに登録するクラス(MyClassJS)を準備
        var MyClassJS = (function () {
            function MyClassJS() {
            }
            MyClassJS.prototype.foo = function (a1, a2, a3) {
                return a1 + a2 + a3;
            };
            MyClassJS.prototype.fooA = function (a1, a2, a3) {
                return function(callback) {
                    callback(a1 + a2, a3);
                }
            };
            return MyClassJS;
        })();
        functionChannelR.bind("MyClassJS", new MyClassJS());

        // 送信側からfooを実行
        functionChannelS.invoke("MyClassJS", "foo", ["A", "BB", "CCC"], function(error, result) {
            console.log("foo: " + result);
            expect("ABBCCC").toEqual(result);
        });

        // 送信側からfooAを実行
        functionChannelS.invoke("MyClassJS", "fooA", ["D", "E", "F"], function(error, ...results) {
            console.log("fooA: " + results[0] + results[1]);
            expect(results[0]).toEqual("DE");
            expect(results[1]).toEqual("F");
        });

        // 破棄
        functionChannelR.unbind("MyClassJS");
        functionChannelR.destroy();
        dataChannelR.destroy();
        dataBusR.destroy();
        functionChannelS.destroy();
        dataChannelS.destroy();
        dataBusS.destroy();
    });
});