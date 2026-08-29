import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 4 else {
    FileHandle.standardError.write("usage: pdf2png <pdf> <outdir> <targetWidth>\n".data(using: .utf8)!)
    exit(2)
}
let pdfURL = URL(fileURLWithPath: args[1])
let outDir = args[2]
let targetW = CGFloat(Double(args[3]) ?? 1280)

guard let doc = CGPDFDocument(pdfURL as CFURL) else {
    FileHandle.standardError.write("cannot open \(args[1])\n".data(using: .utf8)!)
    exit(1)
}
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

for i in 1...doc.numberOfPages {
    guard let page = doc.page(at: i) else { continue }
    let box = page.getBoxRect(.mediaBox)
    let scale = targetW / box.width
    let w = Int((box.width * scale).rounded())
    let h = Int((box.height * scale).rounded())
    print("page \(i): mediaBox \(Int(box.width))x\(Int(box.height)) -> \(w)x\(h)")
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8,
                              bytesPerRow: 0, space: cs,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
    ctx.interpolationQuality = .high
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(w), height: CGFloat(h)))
    ctx.scaleBy(x: scale, y: scale)
    ctx.translateBy(x: -box.minX, y: -box.minY)
    ctx.drawPDFPage(page)
    guard let img = ctx.makeImage() else { continue }
    let path = String(format: "%@/slide-%02d.png", outDir, i)
    guard let dest = CGImageDestinationCreateWithURL(
        URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil) else { continue }
    CGImageDestinationAddImage(dest, img, nil)
    CGImageDestinationFinalize(dest)
}
