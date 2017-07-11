// Copyright © 2017 DWANGO Co., Ltd.

import { DataChannel, DataChannelCallback, DataChannelHandler, DataChannelResponseCallback, DataChannelError } from '@cross-border-bridge/data-channel';

export { FunctionChannel, FunctionChannelCallback }

/**
 * data-channel format
 */
const FMT_OMI = 'omi'; // Object Method Invocation
const FMT_EDO = 'edo'; // EncoDed Object
const FMT_ERR = 'err'; // ERRor

/**
 * error-type of function channel
 */
const ERROR_TYPE_OBJECT_NOT_BOUND = 'ObjectNotBound';
const ERROR_TYPE_METHOD_NOT_EXIST = 'MethodNotExist';

type FunctionChannelCallback = (error?: string, result?: any) => void;
type KnownFormat = 'omi' | 'edo' | 'err'; 
type PacketFormat = KnownFormat | string;

class FunctionChannel {
    private _dataChannel: DataChannel;
    private _onReceivePacket: DataChannelHandler;
    private _bindingObjects: any = {};

    /**
     * コンストラクタ (FunctionChannel を生成する)
     * 
     * @param dataChannel DataChannel
     */
    constructor(dataChannel: DataChannel) {
        this._dataChannel = dataChannel;
        this._onReceivePacket = this.onReceivePacket.bind(this);
        this._dataChannel.addHandler(this._onReceivePacket);
    }

    /**
     * デストラクタ (FunctionChannel を破棄)
     */
    destroy(): void {
        if (!this._dataChannel) return;
        this._dataChannel.removeHandler(this._onReceivePacket);
        this._dataChannel = undefined;
        this._onReceivePacket = undefined;
        this._bindingObjects = {};
    }

    /**
     * 破棄済みか確認する
     * 
     * @return 結果（true: 破棄済み, false: 破棄されていない）
     */
    destroyed(): boolean {
        return !this._dataChannel;
    }

    /**
     * オブジェクト識別子 と オブジェクト を紐付ける
     * 
     * @param id オブジェクト識別子
     * @param object オブジェクト
     */
    bind(id: string, object: Object): void {
        if (!this._dataChannel) return;
        this._bindingObjects[id] = object;
    }

    /**
     * オブジェクト識別子 の紐付けを解除する
     * 
     * @param id オブジェクト識別子
     */
    unbind(id: string): void {
        if (!this._dataChannel) return;
        delete this._bindingObjects[id];
    }

    /**
     * 端方(native側) で bind されているオブジェクトのメソッドを実行する
     * 
     * @param id 端方で bind されているオブジェクト識別子
     * @param method 実行するメソッド名
     * @param args 実行するメソッドに指定する引数
     * @param [callback] 実行結果の戻り値を受け取るハンドラ（戻り値が不要な場合は指定してなくよい）
     * @param [timeout] 応答待ちのタイムアウト
     */
    invoke(id: string, method: string, args?: any[], callback?: FunctionChannelCallback, timeout?: number): void {
        if (!this._dataChannel) return;
        var dcc: DataChannelCallback;
        if (callback) {
            dcc = function(error: DataChannelError, packet: any) {
                if (error) {
                    callback.apply(this, [error]);
                } else if (FMT_ERR === packet[0]) {
                    callback.apply(this, [packet[1]]);
                } else {
                    callback.apply(this, [undefined, packet[1]]);
                }
            }
        } else {
            dcc = undefined;
        }
        this._dataChannel.send([FMT_OMI, [id, method, args]], dcc, timeout);
    }

    private onReceivePacket(packet: any[], callback: DataChannelResponseCallback): void {
        if (!this._dataChannel) return;
        if (packet[0] === FMT_OMI) {
            this.dispatchMethodInvocation(packet[1][0], packet[1][1], packet[1][2], callback);
        } else {
            console.warn('unknown format', packet[0]);
        }
    }
    
    private dispatchMethodInvocation(id: string, methodName: string, args: any[], callback?: DataChannelResponseCallback) {
        if (!this._bindingObjects[id]) {
            if (callback) callback([FMT_ERR, ERROR_TYPE_OBJECT_NOT_BOUND]);
            return;
        }
        if (!this._bindingObjects[id][methodName]) {
            if (callback) callback([FMT_ERR, ERROR_TYPE_METHOD_NOT_EXIST]);
            return;
        }
        var result: any = this._bindingObjects[id][methodName](...args);
        if (callback) {
            if (!!(result && result.constructor && result.call && result.apply)) {
                result(function(r: any) {
                    callback([FMT_EDO, r]);
                });
            } else {
                callback([FMT_EDO, result]);
            }
        }
    }
}
