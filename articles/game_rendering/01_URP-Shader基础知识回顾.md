# Shader 第一篇 · URP Shader基础知识回顾

> 年少爱喝苹果醋 · 编辑于 2025年04月25日

## 1. URP概述

Unity提供了多种渲染管线，包括内置渲染管线（Build-in Render Pipeline）、SRP、URP和HDRP。

其中内置渲染管线适用于简单项目和3D应用，提供了光照、阴影、反射和抗锯齿等渲染特效。但它不支持移动设备的多线程渲染，不如URP高效。

通用渲染管线Universal Render Pipeline，简称URP，适用于大部分移动设备、PC和主机平台，支持移动设备的多线程渲染，提供了前向渲染、延迟渲染、透明渲染等预设路径，还可以自定义SRP自由度。

## 2. URP Shader的基本结构

相较于Unity内建渲染管线（Build-in Render Pipeline），使用URP通用渲染管线编写Shader时，Shader的基本结构会有一些细微的变化：

（1）基于Unity内建渲染管线编写Shader时使用的是CG语言，而编写URP Shader时使用的是HLSL语言，也就是说Shader代码的Pass块中不再使用CGPROGRAM-ENDCG包裹，而是使用HLSLPROGRAM-ENDHLSL。

（2）在URP Shader中，如果当前Shader出现故障无法正确执行，一般可以设置回退路径为 `Hidden/Universal Render Pipeline/FallbackError`，具体代码为：

```hlsl
FallBack "Hidden/Universal Render Pipeline/FallbackError"
```

（3）URP Shader的Pass块中，通常需要用到URP插件目录下的ShaderLibrary/Core.hlsl文件，可以在Unity编辑器的Packages目录下找到该文件，复制其路径然后添加到pass块中，代码如下：

```hlsl
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
```

（4）在URP Shader的SubShader中，Tags中的Render Pipeline需要设置为`"UniversalPipeline"`，表示当前Shader使用URP渲染管线：

```hlsl
Tags {"RenderPipeline" = "UniversalPipeline"}
```

（5）在URP Shader的Pass块中，Tags中的LightMode与内置渲染管线中也不相同，可以设置为`"UniversalForward"`，代码如下：

```hlsl
Tags {"LightMode"="UniversalForward"}
```

（6）在URP Shader中，不支持fixed基本数据类型，因为fixed是来自CG语言的数据类型，在HLSL中不被支持，一般使用half代替fixed类型。

（7）在URP Shader中，通常将公用的文件引用、变量等包裹在 HLSLINCLUDE 中，这样一个SubShader内的多个Pass块就可以共享一些引用及变量，对于公用的材质属性，可以进一步使用材质属性常量缓冲区 CBUFFER_START(UnityPerMaterial) 包裹，示例代码如下：

```hlsl
HLSLINCLUDE
    #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

    CBUFFER_START(UnityPerMaterial)
        float _ColorIntensity;
        float4 _MainColor;
        TEXTURE2D(_MainTex); 
        SAMPLER(sampler_MainTex);
    CBUFFER_END
ENDHLSL
```

（8）在URP Shader中，顶点着色器和片元着色器的名字通常不再使用vert和frag，而是根据当前光照模型进行命名，例如对于一个不受光照的URP Shader，顶点着色器和片元着色器可以采用以下命名：

```hlsl
#pragma vertex UnlitPassVertex
#pragma fragment UnlitPassFragment
```

对于顶点和片元的数据结构，也不再使用 appdata 和 v2f，而是使用Attributes和Varyings，字段命名通常也要加上坐标空间后缀，OS/WS/VS/CS 分别表示 对象空间/世界空间/视图空间/裁剪空间：

```hlsl
struct Attributes
{
    float4 positionOS : POSITION;  // OS/WS/VS/CS 后缀分别表示 对象空间/世界空间/视图空间/裁剪空间
    float2 uv : TEXCOORD0;
    float3 normalOS : NORMAL;
};

struct Varyings
{
    float4 positionCS : SV_POSITION;
    float2 uv : TEXCOORD0;
    float3 normalWS : TEXCOORD1;
    float3 positionWS : TEXCOORD2;
};
```

## 3. 深度相关

深度（Depth）是3D图形渲染中一个核心概念，它决定了物体在场景中的前后遮挡关系。在一个摄像机的视锥范围内，从近裁剪面到远裁剪面，深度值范围是0~1。

深度缓冲（Z-Buffer）是存储每个像素深度值的特殊缓冲区，在渲染开始前，深度缓冲区通常被初始化为1.0，也就是最大深度，当渲染一个像素时，会计算该像素的深度值，并与深度缓冲区中相应位置的当前深度值比较，然后根据ZTest设置决定是否保留该像素，如果像素通过测试，可以选择是否更新深度缓冲区（由ZWrite控制）。

在Unity中，渲染队列会影响物体的渲染顺序，以下是Unity内置的渲染队列：

1. **Background**: 索引值1000，该队列会在任何其他队列之前被渲染，通常使用该队列来渲染那些需要绘制在背景上的物体。
2. **Geometry**: 索引值2000，默认的渲染队列，大多数物体都使用这个队列，不透明物体使用这个队列。
3. **AlphaTest**: 索引值2450，需要透明度测试的物体使用该队列，在Unity5中，该队列从Geometry队列中被单独分出来，因为在所有不透明物体渲染之后再渲染该队列会更加高效。
4. **Transparent**: 索引值3000，该队列中的物体在所有Geometry和Alpha Test物体渲染后，再按从后往前的顺序进行渲染，任何使用了透明度混合的物体都应该使用该队列。
5. **Overlay**: 索引值4000，该队列用于实现一些叠加效果，任何需要在最后渲染的物体都应该使用该队列。

注意：在深度测试中，当两个面深度值非常接近时可能会出现闪烁问题（Z-Fighting），通常可以通过增加几何体间距，或是使用Depth Offset，或是调整渲染顺序来解决该问题。

## 4. 纹理采样

Unity中有几种不同的纹理采样过滤模式（Filter Mode），分别是Point、Bilinear、Trilinear，其中Point模式性能最高，但是锯齿相对明显，适用于像素化风格的纹理贴图，而三线性模式视觉效果最为平滑，锯齿最少，适用于高质量的3D游戏，但是性能开销相对较高。双线性过滤模式介于两者之间。

在URP Shader中，要采样纹理需要先声明纹理属性，再声明纹理变量和采样器，在片元着色过程中，使用采样函数进行采样，具体代码如下：

```hlsl
// 1.声明纹理属性：
_BaseMap("Albedo", 2D) = "white" {}

// 2.声明采样器和纹理变量：
TEXTURE2D(_BaseMap);
SAMPLER(sampler_BaseMap);

// 3.采样纹理：
half4 color = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv);
```

## 5. 其他URP Shader相关内容

（1）在URP Shader中可以设置每一个SubShader的LOD，用于实现根据相机视野距离物体远近展示不同品质材质的物体，指定SubShader LOD代码如下：

```hlsl
SubShader
{
    LOD 300
    // 高质量pass（近距离使用）
    
    Pass { ... }
}

SubShader
{
    LOD 200
    // 中等质量pass（中距离使用）
    
    Pass { ... }
}

SubShader
{
    LOD 100
    // 低质量pass（远距离使用）
    
    Pass { ... }
}
```

通过以下C#代码可以设置所有Shader的最大LOD级别：

```csharp
Shader.globalMaximumLOD = 200;
```

如果需要设置指定URP Shader的LOD级别，可以通过以下方法：

```csharp
Shader urpLitShader = Shader.Find("Universal Render Pipeline/Lit");
Debug.Log(urpLitShader.maximumLOD);
```

（2）在代码给Shader传参时，可以给单个物体的材质传参，也可以给使用了同一材质的所有物体传参，也可以给所有使用了同一shader的材质传参，以下是三种方法的具体执行方式：

给单个物体的材质传参：

```csharp
Material myMaterial = GetComponent<Renderer>().material;
myMaterial.SetFloat("_MyFloat", 1.0f);
```

修改所有相同材质的物体：

```csharp
Material sharedMat = GetComponent<Renderer>().sharedMaterial;
sharedMat.SetColor("_Color", Color.blue);
```

给所有使用同一Shader的材质传递参数：

```csharp
Shader.SetGlobalFloat("_GlobalFloat", 2.0f);
Shader.SetGlobalInt("_GlobalInt", 100);
```

## 6. 实现一个不受光照的URP Shader

以下是一个URP Unlit Shader实现：

```hlsl
Shader "URP/Unlit"
{
    Properties
    {
        _BaseMap("Base Map", 2d) = "white" {}
        _BaseColor("Base Color", Color) = (1, 1, 1, 1)
    }

    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque"
            "Queue" = "Geometry"
        }

        HLSLINCLUDE
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)

                TEXTURE2D(_BaseMap); 
                SAMPLER(sampler_BaseMap); 
                float4 _BaseMap_ST;
                float4 _BaseColor;

            CBUFFER_END
        ENDHLSL

        Pass
        {
            Name "Unlit"

            HLSLPROGRAM

            #pragma vertex UnlitPassVertex
            #pragma fragment UnlitPassFragment

            struct Attributes
            {
                float4 positionOS   : POSITION;
                float2 uv           : TEXCOORD0;
                float4 color        : COLOR;
            };

            struct Varyings
            {
                float4 positionCS   : SV_POSITION;
                float2 uv           : TEXCOORD0;
                float4 color        : COLOR;
            };

            Varyings UnlitPassVertex(Attributes input)
            {
                Varyings output = (Varyings)0;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(input.positionOS.xyz);

                output.positionCS = positionInputs.positionCS;
                output.uv = TRANSFORM_TEX(input.uv, _BaseMap);
                output.color = input.color;

                return output;
            }

            half4 UnlitPassFragment(Varyings input) : SV_Target
            {
                half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv);

                return baseMap * _BaseColor * input.color;
            }

            ENDHLSL
        }
    }

    FallBack "Diffuse"
}
```
