# <p align="center"><img src="title.png"/></p>
- FunctionChannelのTypeScript用の実装を提供します
- Node.jsで利用することを想定しています

## Setup
### package.json
```
    "dependencies": {
        "@cross-border-bridge/function-channel": "~2.1.0"
    },
```

## Usage
#### step 1: import

```typescript
import * as fc from "@cross-border-bridge/function-channel";
```

#### step 2: リモート側から実行できるメソッドを定義したクラスを準備
```typescript
class MyClassTS {
    foo(a1: string, a2: string, a3: string): string {
        return a1 + a2 + a3;
    }
}
```

#### step 3: FunctionChannelを準備
使用するDataChannelインスタンスを指定してFunctionChannelを生成します。

```typescript
    var functionChannel: fc.FunctionChannel = fc.FunctionChannelFactory.create(dataChannel);
```

#### step 4: 準備したクラスの実体をbind
step 2 で準備したクラスの実体を `FunctionChannel#bind` で登録することで, リモート側からメソッドを呼び出すことができる状態になります。

```typescript
    var myObject: MyClassTS = new MyClassTS();
    functionChannel.bind("MyClassTS", myObject);
```

> `FunctionChannel#unbind` で `bind` 状態を解除することができます。

#### step 5: リモート側のメソッドを実行
`FunctionChannel#invoke` でリモート側に `bind` されているオブジェクトのメソッドを実行することができます。

```typescript
    functionChannel.invoke("MyClassJava", "foo", ["arg1", "arg2", "arg3"], (error?, result?) => {
        if (error) {
            実行に失敗した場合の処理
        } else {
            実行に成功した場合の処理（戻り値が result に格納されている）
        }
    });
```

実行結果を確認する必要がない場合は, `callback` の指定を省略してください。

```typescript
    functionChannel.invoke("MyClassJava", "foo", ["arg1", "arg2", "arg3"]);
```

> `callback` を省略した場合, FunctionChannel は PUSH で要求を送信するため, 実行が正常にできたのかを確認することができません。

#### step 6: 破棄
`FunctionChannel#destroy` で破棄できます

```typescript
    functionChannel.destroy();
```

> FunctionChannelをdestroyしても下位層（DataChannel, DataBus）のdestroyは行われません。

## License
- Source code, Documents: [MIT](LICENSE)
- Image files: [CC BY 2.1 JP](https://creativecommons.org/licenses/by/2.1/jp/)
