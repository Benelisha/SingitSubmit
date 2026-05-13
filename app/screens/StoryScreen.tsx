import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Canvas } from "@react-three/fiber/native"
import { useAppTheme } from "@/theme/context"
import { BookExperience } from "@/components/3d/BookExperience"
import { BookPageProvider, useBookPage } from "@/components/3d/BookPageContext"
import {
    CoverPage,
    ChapterPage,
    IllustrationPage,
    BackCoverPage,
    LOGO_URI,
    WELCOME_URI,
} from "@/components/3d/BookContent"

// ─── Page data ────────────────────────────────────────────────────────────────
// 4 leaves → page states 0 (cover closed) … 4 (back cover)
const BOOK_SHEETS = [
    {
        frontContent: <CoverPage />,
        backContent: (
            <ChapterPage
                chapter="Chapter One"
                heading="The Beginning"
                body={[
                    "In a land where books live",
                    "and breathe, the first page",
                    "turned with a golden shimmer.",
                    "",
                    "Every word is a doorway,",
                    "every sentence a new world",
                    "waiting to be discovered.",
                ]}
                prevPage={0}
                nextPage={2}
            />
        ),
    },
    {
        frontContent: (
            <ChapterPage
                chapter="Chapter Two"
                heading="The Journey"
                body={[
                    "The traveller walked between",
                    "lines of ink and meaning,",
                    "each step a new discovery.",
                    "",
                    "Mountains of metaphor rose",
                    "on the horizon, and rivers",
                    "of rhythm flowed below.",
                ]}
                prevPage={1}
                nextPage={3}
            />
        ),
        backContent: (
            <IllustrationPage
                imageSrc={WELCOME_URI}
                caption="A vision from between the pages"
                prevPage={2}
                nextPage={3}
            />
        ),
    },
    {
        frontContent: (
            <ChapterPage
                chapter="Chapter Three"
                heading="The Discovery"
                body={[
                    "Deep inside the tome there lay",
                    "a secret known only to those",
                    "who dared read on.",
                    "",
                    "It was not a treasure of gold",
                    "nor silver — but of stories",
                    "more precious than either.",
                ]}
                prevPage={2}
                nextPage={4}
            />
        ),
        backContent: (
            <IllustrationPage
                imageSrc={LOGO_URI}
                caption="The mark of the author"
                prevPage={3}
                nextPage={4}
            />
        ),
    },
    {
        frontContent: (
            <ChapterPage
                chapter="Chapter Four"
                heading="The Return"
                body={[
                    "Every great story must circle",
                    "back to where it began, but",
                    "the reader returns changed.",
                    "",
                    "The pages that once held",
                    "mystery now glow with the",
                    "warmth of understanding.",
                ]}
                prevPage={3}
                nextPage={4}
            />
        ),
        backContent: <BackCoverPage />,
    },
]

function StoryScreenInner() {
    const {
        theme: { colors },
    } = useAppTheme()

    const { page, setPage } = useBookPage()
    const totalPages = BOOK_SHEETS.length

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* <View style={styles.copyBlock}>
                <Text style={[styles.eyebrow, { color: colors.tint }]}>StoryScreen</Text>
                <Text style={[styles.title, { color: colors.text }]}>Procedural book cover</Text>
            </View> */}

            <View style={styles.canvasShell}>
                <Canvas shadows camera={{ position: [0, 1, 4], fov: 45, near: 0.1, far: 100 }}>
                    <color attach="background" args={[colors.background]} />
                    <fog attach="fog" args={[colors.background, 7.8, 12.8]} />
                    <BookExperience sheets={BOOK_SHEETS} />

                </Canvas>
            </View>

            {/* Page navigation */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.navButton, { borderColor: colors.tint, opacity: page === 0 ? 0.3 : 1 }]}
                    onPress={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                >
                    <Text style={[styles.navLabel, { color: colors.text }]}>‹ Prev</Text>
                </TouchableOpacity>

                <Text style={[styles.pageCounter, { color: colors.text }]}>
                    {page === 0 ? "Cover" : page === totalPages ? "Back" : `Page ${page}`}
                </Text>

                <TouchableOpacity
                    style={[styles.navButton, { borderColor: colors.tint, opacity: page === totalPages ? 0.3 : 1 }]}
                    onPress={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                >
                    <Text style={[styles.navLabel, { color: colors.text }]}>Next ›</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default function StoryScreen() {
    return (
        <BookPageProvider>
            <StoryScreenInner />
        </BookPageProvider>
    )
}

const styles = StyleSheet.create({
    canvasShell: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    controls: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
    },
    copyBlock: {
        paddingHorizontal: 24,
        paddingTop: 72,
        paddingBottom: 8,
    },
    eyebrow: {
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 1.2,
        marginBottom: 8,
        textTransform: "uppercase",
    },
    navButton: {
        borderRadius: 24,
        borderWidth: 1,
        minWidth: 90,
        paddingHorizontal: 18,
        paddingVertical: 10,
        alignItems: "center",
    },
    navLabel: {
        fontSize: 16,
        fontWeight: "600",
    },
    pageCounter: {
        fontSize: 15,
        opacity: 0.7,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
    },
})
