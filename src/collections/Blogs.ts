import { BlocksFeature, FixedToolbarFeature, InlineToolbarFeature, UploadFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import { CollectionConfig } from "payload";

export const Blogs:CollectionConfig = {
    slug: "blogs",
    access: {
        read: () => true,
        delete: () => true,
        update: () => true,
        create: () => true
    },
    admin: {
        useAsTitle: "title"
    },
    fields: [{
        type: "text",
        name: "text",
    },{
        type: "richText",
        name: "content",
        editor: lexicalEditor({
            features: ({ defaultFeatures,rootFeatures}) => {
                return [...defaultFeatures, FixedToolbarFeature(),InlineToolbarFeature(),UploadFeature({
                    enabledCollections: ['media'],
                }),BlocksFeature({
                    blocks: [{
                        slug: "Block01",
                        fields: [{
                            type: "text",
                            name: "heading"
                        },{
                            type: "textarea",
                            name:"description"
                        }]
                    }],
                    inlineBlocks: [{
                        slug: "inlineBlock01",
                        fields:[{
                            type: "text",
                            name: "link"
                        }]
                    }]
                })]
            }
        })
    }]
}